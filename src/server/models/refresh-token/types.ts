import { ObjectId, type IndexDescription } from 'mongodb';
import { type User } from '../users';

export const REFRESH_TOKENS_COLLECTION = 'refreshtokens';

// refresh token document fields
export type RefreshTokenDocument = {
  _id: ObjectId;
  tokenHash: string;
  user: ObjectId;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// refresh token document with the owner user populated or null if the user was deleted
export type RefreshTokenWithOwner = RefreshTokenDocument & { owner: User | null };

// indexes for the refresh tokens collection (incrementing)
export const REFRESH_TOKEN_INDEXES: IndexDescription[] = [
  { key: { tokenHash: 1 }, unique: true },
  { key: { user: 1 } },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // expire instantly after countdown
];
