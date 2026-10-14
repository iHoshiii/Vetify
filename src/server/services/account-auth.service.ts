import type { AccountAuthContext, AccountLoginMethods } from '@shared/account-auth';
import crypto from 'node:crypto';

import { revokeAllRefreshTokensForUser } from '../models/refresh-token';
import { nativeSessionsCollection } from '../models/native-session';
import {
  comparePassword,
  findUserWithPasswordById,
  hashPassword,
  usersCollection,
  type User,
} from '../models/users';
import { AppError } from '../utils/AppError';
import { accountIdentities } from './account-auth-identities';
import { passwordEmailReady } from './account-auth-email-proof';
import { requireBrowserSession } from './native-session.service';
import {
  buildAuthorizeUrl,
  createPkcePair,
  getProviderConfig,
  type OAuthProviderName,
} from './oauth.service';
import { sealState } from './oauth-state';
import { consumeAccountLinkProof, requireAccountLinkProof } from './account-link-proof';
import { accountLinkProviderAvailable, tiktokLinkHttpsReady } from './account-link-availability';

async function currentAccount(user: User) {
  const account = await findUserWithPasswordById(user._id);
  if (!account) throw AppError.notFound('Account not found', 'account-changed');
  return account;
}

export async function accountLoginMethods(
  user: User,
  sourceTokenHash: string,
  rawProof: unknown,
  rawEmailProof?: unknown
): Promise<AccountLoginMethods> {
  const account = await currentAccount(user);
  const identities = await accountIdentities(account);
  const hasPassword = Boolean(account.password);
  return {
    hasPassword,
    providers: identities.map((identity) => identity.provider),
    googleAvailable: Boolean(getProviderConfig('google')),
    availableProviders: (['google', 'facebook', 'tiktok'] as const).filter((provider) =>
      accountLinkProviderAvailable(provider)
    ),
    tiktokHttpsReady: tiktokLinkHttpsReady(),
    passwordReady:
      !hasPassword && (await passwordEmailReady(account, sourceTokenHash, rawEmailProof, rawProof)),
    reauthProvider: hasPassword
      ? null
      : identities.find((identity) => getProviderConfig(identity.provider))?.provider ?? null,
  };
}

export async function beginAccountAuthorization(
  user: User,
  sourceTokenHash: string,
  purpose: AccountAuthContext['purpose'],
  currentPassword?: string,
  requestedProvider: OAuthProviderName = 'google',
  rawEmailProof?: unknown
) {
  const account = await currentAccount(user);
  const identities = await accountIdentities(account);
  let provider: OAuthProviderName = requestedProvider;
  if (purpose === 'connect-provider') {
    if (currentPassword && !(await comparePassword(account.password, currentPassword))) {
      throw AppError.badRequest('Your current password is not correct.', 'password-incorrect');
    }
    if (identities.some((identity) => identity.provider === provider)) {
      throw AppError.conflict('This provider is already connected.', 'already-linked');
    }
  } else {
    if (account.password)
      throw AppError.conflict('This account already has a password.', 'password-already-exists');
    const identity = identities.find((candidate) => getProviderConfig(candidate.provider));
    if (!identity)
      throw new AppError(501, 'Your connected provider is unavailable.', 'provider-unavailable');
    provider = identity.provider;
  }
  const config = getProviderConfig(provider);
  if (!config || !accountLinkProviderAvailable(provider))
    throw new AppError(501, 'This provider is unavailable.', 'provider-unavailable');
  const proof = await requireAccountLinkProof(
    account,
    sourceTokenHash,
    purpose === 'connect-provider' ? provider : 'local',
    rawEmailProof
  );
  const state = crypto.randomBytes(16).toString('base64url');
  const { verifier, challenge } = createPkcePair();
  const context = {
    purpose,
    userId: account._id.toHexString(),
    sourceTokenHash,
    emailLinkGeneration: proof.generation,
  };
  return {
    url: buildAuthorizeUrl(provider, config, state, challenge),
    stateCookie: sealState(provider, state, verifier, undefined, context),
  };
}

export async function addAccountPassword(
  user: User,
  sourceTokenHash: string,
  rawEmailProof: unknown,
  newPassword: string,
  rawLegacyProof?: unknown
) {
  const account = await currentAccount(user);
  if (account.password)
    throw AppError.conflict('This account already has a password.', 'password-already-exists');
  if (!(await passwordEmailReady(account, sourceTokenHash, rawEmailProof, rawLegacyProof)))
    throw AppError.forbidden('Verify your email before linking Public Login.', 'reauth-required');
  const password = await hashPassword(newPassword);
  const session = await requireBrowserSession(sourceTokenHash);
  if (!session.owner._id.equals(account._id)) {
    throw AppError.forbidden('Confirm your provider account again.', 'reauth-required');
  }
  const proof = await requireAccountLinkProof(account, sourceTokenHash, 'local', rawEmailProof);
  await consumeAccountLinkProof(proof);
  const updated = await usersCollection().updateOne(
    { _id: account._id, password: null, email: proof.email },
    { $set: { password, updatedAt: new Date() } }
  );
  if (!updated.modifiedCount)
    throw AppError.conflict('This account already has a password.', 'password-already-exists');
  await revokeAllRefreshTokensForUser(account._id);
  await nativeSessionsCollection().updateMany(
    { user: account._id, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}
