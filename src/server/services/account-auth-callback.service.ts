import type { AccountAuthContext } from '@shared/account-auth';

import { insertAuthIdentity } from '../models/auth-identities';
import { findUserWithPasswordById, normalizeEmail, type User } from '../models/users';
import { AppError } from '../utils/AppError';
import { accountIdentities } from './account-auth-identities';
import { sealPasswordProof } from './account-auth-proof';
import { requireBrowserSession } from './native-session.service';
import type { OAuthProfile, OAuthProviderName } from './oauth.service';

export async function completeAccountAuthorization(
  user: User,
  context: AccountAuthContext,
  provider: OAuthProviderName,
  profile: OAuthProfile
): Promise<string | null> {
  const session = await requireBrowserSession(context.sourceTokenHash);
  if (!session.owner._id.equals(user._id) || user._id.toHexString() !== context.userId) {
    throw AppError.unauthorized('Please sign in again.', 'session-expired');
  }
  const account = await findUserWithPasswordById(user._id);
  if (!account) throw AppError.notFound('Account no longer exists.', 'account-changed');
  if (!profile.emailVerified || !profile.email || normalizeEmail(profile.email) !== account.email) {
    throw AppError.badRequest('The provider email does not match this account.', 'email-mismatch');
  }
  if (!profile.providerId || typeof profile.providerId !== 'string') {
    throw AppError.badRequest('The provider account does not match.', 'identity-mismatch');
  }
  const identities = await accountIdentities(account);
  if (context.purpose === 'connect-provider') {
    if (provider !== 'google' && provider !== 'facebook')
      throw AppError.badRequest('Wrong provider.', 'identity-mismatch');
    if (!account.password)
      throw AppError.badRequest('This account changed. Please try again.', 'account-changed');
    if (identities.some((identity) => identity.provider === provider)) {
      throw AppError.conflict('This provider is already connected.', 'already-linked');
    }
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
  });
}
