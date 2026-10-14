import type { AccountAuthContext } from '@shared/account-auth';

import { insertAuthIdentity } from '../models/auth-identities';
import { findUserWithPasswordById, normalizeEmail, type User } from '../models/users';
import { AppError } from '../utils/AppError';
import { accountIdentities } from './account-auth-identities';
import { sealPasswordProof } from './account-auth-proof';
import { consumeAccountLinkProof, requireAccountLinkProof } from './account-link-proof';
import { requireBrowserSession } from './native-session.service';
import type { OAuthProfile, OAuthProviderName } from './oauth.service';

export async function completeAccountAuthorization(
  user: User,
  context: AccountAuthContext,
  provider: OAuthProviderName,
  profile: OAuthProfile,
  rawEmailProof?: unknown
): Promise<string | null> {
  const session = await requireBrowserSession(context.sourceTokenHash);
  if (!session.owner._id.equals(user._id) || user._id.toHexString() !== context.userId) {
    throw AppError.unauthorized('Please sign in again.', 'session-expired');
  }
  const account = await findUserWithPasswordById(user._id);
  if (!account) throw AppError.notFound('Account no longer exists.', 'account-changed');
  const proof = await requireAccountLinkProof(
    account,
    context.sourceTokenHash,
    context.purpose === 'connect-provider' ? provider : 'local',
    rawEmailProof
  );
  if (proof.generation !== context.emailLinkGeneration) {
    throw AppError.forbidden('Verify your email again before linking.', 'email-link-required');
  }
  if (
    provider !== 'tiktok' &&
    (!profile.emailVerified || !profile.email || normalizeEmail(profile.email) !== account.email)
  ) {
    throw AppError.badRequest('The provider email does not match this account.', 'email-mismatch');
  }
  if (typeof profile.providerId !== 'string' || !profile.providerId.trim()) {
    throw AppError.badRequest('The provider account does not match.', 'identity-mismatch');
  }
  const identities = await accountIdentities(account);
  if (context.purpose === 'connect-provider') {
    if (identities.some((identity) => identity.provider === provider)) {
      throw AppError.conflict('This provider is already connected.', 'already-linked');
    }
    await consumeAccountLinkProof(proof);
    await insertAuthIdentity({ user: account._id, provider, providerId: profile.providerId });
    return null;
  }
  if (account.password)
    throw AppError.conflict('This account already has a password.', 'account-changed');
  if (
    !identities.some(
      (identity) => identity.provider === provider && identity.providerId === profile.providerId
    )
  ) {
    throw AppError.badRequest('The provider account does not match.', 'identity-mismatch');
  }
  return sealPasswordProof({
    ...context,
    purpose: 'add-password',
    provider,
    providerId: profile.providerId,
    email: account.email,
    expiresAt: proof.expiresAt,
  });
}
