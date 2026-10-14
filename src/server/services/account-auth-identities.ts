import { listAuthIdentities, findAuthIdentity } from '../models/auth-identities';
import type { User } from '../models/users';
import { AppError } from '../utils/AppError';
import { isOAuthProviderName, type OAuthProviderName } from './oauth.service';

export type AccountIdentity = { provider: OAuthProviderName; providerId: string };

export async function accountIdentities(user: User): Promise<AccountIdentity[]> {
  const connected = await listAuthIdentities(user._id);
  const identities: AccountIdentity[] = connected.map(({ provider, providerId }) => ({
    provider,
    providerId,
  }));
  if (isOAuthProviderName(user.provider) && user.providerId) {
    const claimed = await findAuthIdentity(user.provider, user.providerId);
    const sameProvider = identities.find((identity) => identity.provider === user.provider);
    if (
      (claimed && !claimed.user.equals(user._id)) ||
      (sameProvider && sameProvider.providerId !== user.providerId)
    ) {
      throw AppError.conflict('This login method belongs to another account.', 'identity-in-use');
    }
    if (!sameProvider) identities.push({ provider: user.provider, providerId: user.providerId });
  }
  return identities;
}
