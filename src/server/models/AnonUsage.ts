import { ANON_QUOTA_WINDOW_HOURS } from '@shared/limits';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db';

// anonID is stored in a cookie, and the usage record is stored in the database.
// the cookie is signed to prevent tampering, but it does not expire with the record.
// this allows the user to continue using the same anonID across multiple sessions, even if the record has expired.

export const ANON_USAGES_COLLECTION = 'anonusages';

export type AnonUsageDocument = {
  _id: ObjectId;
  anonId: string;
  chatCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

// list the anon in ascending order, so that the oldest anon is first.
export const ANON_USAGE_INDEXES: IndexDescription[] = [
  { key: { anonId: 1 }, unique: true }, // index on anonId to ensure uniqueness
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, // index on expiresAt to automatically delete expired documents
];

// resets the quota after 86 400 000 ms or 24 hours
export const ANON_QUOTA_WINDOW_MS = ANON_QUOTA_WINDOW_HOURS * 60 * 60 * 1000;

export function anonUsagesCollection(): Collection<AnonUsageDocument> {
  return getDb().collection<AnonUsageDocument>(ANON_USAGES_COLLECTION);
}
