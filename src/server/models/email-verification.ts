import { ObjectId, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db';

export const EMAIL_VERIFICATIONS_COLLECTION = 'emailverifications';
export const EMAIL_VERIFICATION_INDEXES: IndexDescription[] = [
  { key: { user: 1 }, unique: true },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];

export type EmailVerificationDocument = {
  _id: ObjectId;
  user: ObjectId;
  email: string;
  generation: string;
  codeHash: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  failedAttempts: number;
  consumedAt: Date | null;
};

export const emailVerificationsCollection = () =>
  getDb().collection<EmailVerificationDocument>(EMAIL_VERIFICATIONS_COLLECTION);
