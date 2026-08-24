import type { PublicUser, User, UserDocument } from './types';

// transform the user document from the database to a public user object
// this is what can be seen in the client side (without the password hash)
export function toPublicUser(user: User | UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? null,
    provider: user.provider,
    avatarUrl: user.avatarUrl ?? null,
    emailVerified: user.emailVerified,
    // Falls back for documents written before the role field existed. The
    // backfill script sets them properly; this keeps a stale read from handing
    // the client an undefined role in the meantime.
    role: user.role ?? 'user',
  };
}
