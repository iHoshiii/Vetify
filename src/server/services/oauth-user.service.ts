import {
  findUserByEmail,
  findUserByProviderId,
  insertUser,
  updateUser,
  type AuthProvider,
  type User,
  type UserPatch,
} from '../models/users';
import { OAuthError, type OAuthProfile } from './oauth.service';

export async function findOrCreateOAuthUser(
  provider: Exclude<AuthProvider, 'local'>,
  profile: OAuthProfile
): Promise<User> {
  const existing = await findUserByProviderId(provider, profile.providerId);
  if (existing) {
    // Let a changed display name or avatar follow the provider. Collecting the
    // changes into a patch and letting an empty one skip the write is what
    // `doc.isModified()` used to decide.
    const patch: UserPatch = {};
    if (profile.name && profile.name !== existing.name) patch.name = profile.name;
    if (profile.avatarUrl && profile.avatarUrl !== existing.avatarUrl) {
      patch.avatarUrl = profile.avatarUrl;
    }

    return (await updateUser(existing._id, patch)) ?? { ...existing, ...patch };
  }

  if (!profile.email) {
    throw new OAuthError(
      `${provider} does not release an email address, so an account cannot be created from it alone`
    );
  }

  const byEmail = await findUserByEmail(profile.email);
  if (byEmail) {
    if (!profile.emailVerified) {
      throw new OAuthError(
        `${provider} did not verify ${profile.email}, which already belongs to an account. ` +
          'Log in with your password instead.'
      );
    }

    const patch: UserPatch = {
      provider,
      providerId: profile.providerId,
      emailVerified: true,
    };
    if (!byEmail.name && profile.name) patch.name = profile.name;
    if (!byEmail.avatarUrl && profile.avatarUrl) patch.avatarUrl = profile.avatarUrl;

    // The fallback only fires if the account was deleted between the read and
    // the write; merging the patch keeps the returned user consistent with what
    // was attempted rather than handing back the pre-link provider.
    return (await updateUser(byEmail._id, patch)) ?? { ...byEmail, ...patch };
  }

  return insertUser({
    email: profile.email,
    name: profile.name,
    provider,
    providerId: profile.providerId,
    avatarUrl: profile.avatarUrl,
    emailVerified: profile.emailVerified,
  });
}
