import { createHash } from 'node:crypto';
import type { IndexDescription } from 'mongodb';
import { getDb } from '../config/db';

export const RATE_LIMITS_COLLECTION = 'ratelimits';
export const RATE_LIMIT_INDEXES: IndexDescription[] = [
  { key: { resetTime: 1 }, expireAfterSeconds: 0 },
];
type Counter = { _id: string; scope: string; totalHits: number; resetTime: Date };
export const rateLimitsCollection = () => getDb().collection<Counter>(RATE_LIMITS_COLLECTION);
export const rateLimitId = (scope: string, key: string) =>
  `${scope}:${createHash('sha256').update(key).digest('hex')}`;

export async function incrementRateLimit(scope: string, key: string, windowMs: number) {
  const now = new Date(Date.now());
  const active = { $gt: ['$resetTime', now] };
  const update = [
    {
      $set: {
        scope,
        totalHits: { $cond: [active, { $add: [{ $ifNull: ['$totalHits', 0] }, 1] }, 1] },
        resetTime: { $cond: [active, '$resetTime', new Date(now.getTime() + windowMs)] },
      },
    },
  ];
  const filter = { _id: rateLimitId(scope, key) };
  let counted;
  try {
    counted = await rateLimitsCollection().findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    counted = await rateLimitsCollection().findOneAndUpdate(filter, update, {
      returnDocument: 'after',
    });
  }
  if (!counted) throw new Error('Could not count the rate-limited request');
  return { totalHits: counted.totalHits, resetTime: counted.resetTime };
}
