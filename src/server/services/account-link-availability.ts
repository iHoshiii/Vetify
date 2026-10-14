import type { AccountAuthProvider, AccountLinkMethod } from '@shared/account-auth';
import { env } from '../config/env';
import { findUserWithPasswordById, type User } from '../models/users';
import { AppError } from '../utils/AppError';
import { accountIdentities } from './account-auth-identities';
import { getProviderConfig } from './oauth.service';

export const tiktokLinkHttpsReady = () => new URL(env.SERVER_URL).protocol === 'https:';
export const accountLinkProviderAvailable = (provider: AccountAuthProvider) =>
  Boolean(getProviderConfig(provider)) && (provider !== 'tiktok' || tiktokLinkHttpsReady());

export async function requireUnlinkedMethod(user: User, method: AccountLinkMethod) {
  const account = await findUserWithPasswordById(user._id);
  if (!account) throw AppError.notFound('Account not found', 'account-changed');
  if (
    method === 'local'
      ? Boolean(account.password)
      : (await accountIdentities(account)).some((identity) => identity.provider === method)
  ) {
    throw AppError.conflict('This sign-in method is already linked.', 'already-linked');
  }
  if (method !== 'local' && !accountLinkProviderAvailable(method))
    throw new AppError(
      501,
      'This sign-in provider is currently unavailable.',
      'provider-unavailable'
    );
  return account;
}
