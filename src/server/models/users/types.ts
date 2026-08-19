import { ObjectId, type IndexDescription } from 'mongodb';

// database collection / table for the users
export const USERS_COLLECTION = 'users';

// social login providers supported by the application
export const AUTH_PROVIDERS = ['local', 'google', 'facebook', 'tiktok'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

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
};

// the users dont need to include this everytime when creating an account
export type UserPatch = Partial<
  Pick<UserDocument, 'name' | 'avatarUrl' | 'provider' | 'providerId' | 'emailVerified'>
>;

// indexes for the users collection in the database
// origanize A-Z
export const USER_INDEXES: IndexDescription[] = [
  { key: { email: 1 }, unique: true },
  // skips any document where social login doesnt exist
  { key: { provider: 1, providerId: 1 }, unique: true, sparse: true },
];
