import { ObjectId, type IndexDescription } from 'mongodb';
import type { AccountLinkMethod } from '@shared/account-auth';
import { getDb } from '../config/db';

export const ACCOUNT_LINK_COLLECTION = 'accountlinkverifications';
export const ACCOUNT_LINK_INDEXES: IndexDescription[] = [
  { key: { user: 1 }, unique: true },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];
export type AccountLinkVerification = {
  _id: ObjectId;
  user: ObjectId;
  email: string;
  method: AccountLinkMethod;
  sourceTokenHash: string;
  generation: string;
  codeHash: string;
  codeExpiresAt: Date;
  expiresAt: Date;
  resendAvailableAt: Date;
  failedAttempts: number;
  verifiedAt: Date | null;
  consumedAt: Date | null;
};
export const accountLinkVerifications = () =>
  getDb().collection<AccountLinkVerification>(ACCOUNT_LINK_COLLECTION);
