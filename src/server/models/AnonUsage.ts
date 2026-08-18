import { ANON_QUOTA_WINDOW_HOURS } from '@shared/limits';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db';

export const ANON_USAGES_COLLECTION = 'anonusages';

/**
 * Chat usage for a visitor with no account during the current allowance window,
 * keyed by the opaque id in their signed cookie. Deliberately holds nothing else
 * — no IP, no user agent, no message content — so an anonymous visitor stays
 * anonymous.
 */
export type AnonUsageDocument = {
  _id: ObjectId;
  anonId: string;
  chatCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export const ANON_USAGE_INDEXES: IndexDescription[] = [
  { key: { anonId: 1 }, unique: true },
  // Mongo drops the record when the window closes, and the next question inserts
  // a fresh one — that expiry IS the reset, so there is no separate cleanup job.
  // Note the TTL monitor sweeps about once a minute, so a lapsed record can
  // linger briefly past its expiry. A visitor being a minute early to their next
  // allowance is not worth a second mechanism to prevent.
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];

export const ANON_QUOTA_WINDOW_MS = ANON_QUOTA_WINDOW_HOURS * 60 * 60 * 1000;

export function anonUsagesCollection(): Collection<AnonUsageDocument> {
  return getDb().collection<AnonUsageDocument>(ANON_USAGES_COLLECTION);
}
