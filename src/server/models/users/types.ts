import { ObjectId, type IndexDescription } from 'mongodb';

// database collection / table for the users
export const USERS_COLLECTION = 'users';

// social login providers supported by the application
export const AUTH_PROVIDERS = ['local', 'google', 'facebook', 'tiktok'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

// what a user is allowed to do. 'user' is everyone by default, 'professional' is
// a vet whose licence has been verified, 'admin' runs the dashboard.
export const USER_ROLES = ['user', 'professional', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// account standing. 'suspended' is meant to be lifted again, 'banned' is not.
// Both are refused by requireRole, and both revoke the refresh tokens so the
// block takes hold without waiting for the access token to expire.
export const USER_STATUSES = ['active', 'suspended', 'banned'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

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
  >
>;

// indexes for the users collection in the database
// origanize A-Z
export const USER_INDEXES: IndexDescription[] = [
  { key: { email: 1 }, unique: true },
  // skips any document where social login doesnt exist
  { key: { provider: 1, providerId: 1 }, unique: true, sparse: true },
  // admin user list is filtered by role and sorted newest-first
  { key: { role: 1, createdAt: -1 } },
  { key: { status: 1 } },
];
