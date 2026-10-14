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
import { unsealPasswordProof } from './account-auth-proof';
import { requireBrowserSession } from './native-session.service';
import {
  buildAuthorizeUrl,
  createPkcePair,
  getProviderConfig,
  type OAuthProviderName,
} from './oauth.service';
import { sealState } from './oauth-state';

async function currentAccount(user: User) {
  const account = await findUserWithPasswordById(user._id);
  if (!account) throw AppError.notFound('Account not found', 'account-changed');
  return account;
}

async function validPasswordProof(user: User, sourceTokenHash: string, rawProof: unknown) {
  const proof = unsealPasswordProof(rawProof);
  if (
    !proof ||
    proof.userId !== user._id.toHexString() ||
    proof.sourceTokenHash !== sourceTokenHash ||
    proof.email !== user.email
  )
    return null;
  const identities = await accountIdentities(user);
  return identities.some(
    (identity) => identity.provider === proof.provider && identity.providerId === proof.providerId
  )
    ? proof
    : null;
}

export async function accountLoginMethods(
  user: User,
  sourceTokenHash: string,
  rawProof: unknown
): Promise<AccountLoginMethods> {
  const account = await currentAccount(user);
  const identities = await accountIdentities(account);
  const hasPassword = Boolean(account.password);
  return {
    hasPassword,
    providers: identities.map((identity) => identity.provider),
    googleAvailable: Boolean(getProviderConfig('google')),
    availableProviders: (['google', 'facebook'] as const).filter((provider) =>
      getProviderConfig(provider)
    ),
    passwordReady:
      !hasPassword && Boolean(await validPasswordProof(account, sourceTokenHash, rawProof)),
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
  requestedProvider: 'google' | 'facebook' = 'google'
) {
  const account = await currentAccount(user);
  const identities = await accountIdentities(account);
  let provider: OAuthProviderName = requestedProvider;
  if (purpose === 'connect-provider') {
    if (!account.password)
      throw AppError.badRequest(
        'Add a password before connecting a provider.',
        'password-required'
      );
    if (!currentPassword || !(await comparePassword(account.password, currentPassword))) {
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
  if (!config) throw new AppError(501, 'This provider is unavailable.', 'provider-unavailable');
  const state = crypto.randomBytes(16).toString('base64url');
  const { verifier, challenge } = createPkcePair();
  const context = { purpose, userId: account._id.toHexString(), sourceTokenHash };
  return {
    url: buildAuthorizeUrl(provider, config, state, challenge),
    stateCookie: sealState(provider, state, verifier, undefined, context),
  };
}

export async function addAccountPassword(
  user: User,
  sourceTokenHash: string,
  rawProof: unknown,
  newPassword: string
) {
  const account = await currentAccount(user);
  if (account.password)
    throw AppError.conflict('This account already has a password.', 'password-already-exists');
  const proof = await validPasswordProof(account, sourceTokenHash, rawProof);
  if (!proof)
    throw AppError.forbidden(
      'Confirm your provider account before adding a password.',
      'reauth-required'
    );
  const password = await hashPassword(newPassword);
  const session = await requireBrowserSession(sourceTokenHash);
  if (!session.owner._id.equals(account._id) || !unsealPasswordProof(rawProof)) {
    throw AppError.forbidden('Confirm your provider account again.', 'reauth-required');
  }
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
