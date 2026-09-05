import {
  AUTH_PROVIDERS,
  USER_ROLES,
  USER_STATUSES,
  type AuthProvider,
  type UserRole,
  type UserStatus,
} from '@shared/schemas';
import { ObjectId, type IndexDescription } from 'mongodb';

// database collection / table for the users
export const USERS_COLLECTION = 'users';

// The provider, role and status lists come from @shared/schemas: the admin
// dashboard renders them as filters and badges, so a second copy here would let
// the server accept a value the UI cannot draw. Re-exported so every existing
// importer of this module keeps working.
//
// 'suspended' and 'banned' are both refused by requireRole, and both revoke the
// account's refresh tokens, so the block takes hold without waiting for the
// access token to expire.
export { AUTH_PROVIDERS, USER_ROLES, USER_STATUSES };
export type { AuthProvider, UserRole, UserStatus };

// user information/documents field in the db
export type UserDocument = {
  _id: ObjectId;
  email: string;
  password: string | null;
  name: string | null;
  provider: AuthProvider;
  providerId: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  // Moderation trail, written whenever an admin moves the status. Null on an
  // account that has never been actioned.
  statusReason: string | null;
  statusChangedBy: ObjectId | null;
  statusChangedAt: Date | null;
  // When a suspension runs out. Null on a ban, which never does, and on an account
  // in good standing.
  statusUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// password should not be seen in the client side
export type User = Omit<UserDocument, 'password'>;

// information/document that is displayed in the client side
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProvider;
  avatarUrl: string | null;
  emailVerified: boolean;
  // Drives which links the client renders. Authorization is still decided
  // server-side from the stored role — this is a hint, not a permission.
  role: UserRole;
};

// the users dont need to include this everytime when creating an account
export type UserPatch = Partial<
  Pick<
    UserDocument,
    | 'name'
    | 'avatarUrl'
    | 'provider'
    | 'providerId'
    | 'emailVerified'
    | 'role'
    | 'status'
    | 'statusReason'
    | 'statusChangedBy'
    | 'statusChangedAt'
    | 'statusUntil'
  >
>;

// indexes for the users collection in the database
// origanize A-Z
export const USER_INDEXES: IndexDescription[] = [
  { key: { email: 1 }, unique: true },
  // One identity per social account. Scoped with a partial filter rather than
  // `sparse`, which does not do what it looks like it does here: a compound
  // sparse index only skips a document when *every* indexed field is missing,
  // and insertUser always writes `provider` plus an explicit `providerId: null`.
  // Every password account therefore indexed as ('local', null) and collided
  // with the next one, so no second local signup could be created.
  {
    key: { provider: 1, providerId: 1 },
    unique: true,
    partialFilterExpression: { providerId: { $type: 'string' } },
  },
  // admin user list is filtered by role and sorted newest-first
  { key: { role: 1, createdAt: -1 } },
  { key: { status: 1 } },
];

/**
 * An account as the admin list shows it.
 *
 * Wider than `PublicUser` — the status, the moderation trail and the dates are
 * the columns a moderator is here for — and still narrower than the document:
 * `providerId` is an identifier at Google's end that nothing on the screen uses,
 * and there is no `password` field to forget about because `User` has none.
 */
export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProvider;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  statusReason: string | null;
  statusChangedBy: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserPage = {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};
