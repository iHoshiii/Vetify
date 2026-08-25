import type { AdminUser, AdminUserPage, PublicUser, User, UserDocument } from './types';

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

/**
 * The admin view of an account.
 *
 * The `?? ` fallbacks cover documents written before roles existed: until the
 * backfill runs, a stale document would otherwise render an empty badge on a row
 * whose whole purpose is to say what this account is.
 */
export function toAdminUser(user: User | UserDocument): AdminUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? null,
    provider: user.provider,
    avatarUrl: user.avatarUrl ?? null,
    emailVerified: user.emailVerified,
    role: user.role ?? 'user',
    status: user.status ?? 'active',
    statusReason: user.statusReason ?? null,
    statusChangedBy: user.statusChangedBy?.toString() ?? null,
    statusChangedAt: user.statusChangedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** A page of accounts, paged by the same arithmetic as every other admin list. */
export function toAdminUserPage(input: {
  items: Array<User | UserDocument>;
  total: number;
  page: number;
  limit: number;
}): AdminUserPage {
  return {
    items: input.items.map(toAdminUser),
    page: input.page,
    limit: input.limit,
    total: input.total,
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
