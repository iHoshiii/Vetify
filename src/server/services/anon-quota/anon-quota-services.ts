import { FREE_ANON_QUERIES } from '@shared/limits';
import { isDbConnected } from '../../config/db';
import { ANON_QUOTA_WINDOW_MS, anonUsagesCollection } from '../../models/AnonUsage';

export type QuotaVerdict = {
  allowed: boolean;
  used: number;
  remaining: number;
};

let warnedAboutMissingDb = false;

// error handling if the db is not connected
export async function consumeAnonQuery(anonId: string): Promise<QuotaVerdict> {
  if (!isDbConnected()) {
    if (!warnedAboutMissingDb) {
      warnedAboutMissingDb = true;
      console.warn(
        '[quota] no database connection; anonymous chat allowance is not being counted. ' +
          'The per-IP limiter is the only ceiling until Mongo is back.'
      );
    }
    // remaining quota (remaining - used)
    return { allowed: true, used: 0, remaining: FREE_ANON_QUERIES };
  }

  const now = new Date();

  // finds or creates a document with the anonId, and increments the chatCount by 1
  const doc = await anonUsagesCollection().findOneAndUpdate(
    { anonId },
    {
      $inc: { chatCount: 1 },
      $set: { updatedAt: now },
      $setOnInsert: {
        expiresAt: new Date(now.getTime() + ANON_QUOTA_WINDOW_MS),
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  // if no request document is found, return the default quota verdict
  if (!doc) return { allowed: true, used: 0, remaining: FREE_ANON_QUERIES };

  // calculation of quota
  const used = doc.chatCount;
  return {
    allowed: used <= FREE_ANON_QUERIES,
    used,
    remaining: Math.max(0, FREE_ANON_QUERIES - used),
  };
}

// if db is not connected, return 0 as quota used
export async function peekAnonUsage(anonId: string): Promise<number> {
  if (!isDbConnected()) return 0;
  // if anon is used, find the document with the anonId and return the chatCount
  const doc = await anonUsagesCollection().findOne<{ chatCount: number }>(
    { anonId },
    { projection: { chatCount: 1, _id: 0 } } // _id is excluded
  );
  // if null, return 0, otherwise return the chatCount
  return doc?.chatCount ?? 0;
}
