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
    // remaining quota (remaining — used)
    return { allowed: true, used: 0, remaining: FREE_ANON_QUERIES };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + ANON_QUOTA_WINDOW_MS);

  // Finds or creates the visitor's record and spends one question against it.
  //
  // A pipeline rather than $inc, because the reset has to happen here. Mongo's
  // TTL monitor sweeps expired records about once a minute, and only on the
  // primary, so a record whose window closed is routinely still present when the
  // next question arrives — and an unconditional $inc kept counting against it,
  // which is why the free allowance appeared never to come back.
  const doc = await anonUsagesCollection().findOneAndUpdate(
    { anonId },
    [
      // A missing expiresAt covers both the upserted document and anything
      // written before this field existed; both want a fresh window.
      { $set: { lapsed: { $lte: [{ $ifNull: ['$expiresAt', new Date(0)] }, now] } } },
      {
        $set: {
          chatCount: { $cond: ['$lapsed', 1, { $add: [{ $ifNull: ['$chatCount', 0] }, 1] }] },
          // Pinned to the first question of the window, so retrying after a
          // refusal cannot push the reset further out.
          expiresAt: { $cond: ['$lapsed', windowEnd, '$expiresAt'] },
          createdAt: { $cond: ['$lapsed', now, { $ifNull: ['$createdAt', now] }] },
          updatedAt: now,
        },
      },
      { $unset: 'lapsed' },
    ],
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
  // Bounded by the window as well as the id: a record the TTL sweep has not
  // reached yet holds a count that has already been forgiven, and reporting it
  // would show a visitor a limit their next question would not actually hit.
  const doc = await anonUsagesCollection().findOne<{ chatCount: number }>(
    { anonId, expiresAt: { $gt: new Date() } },
    { projection: { chatCount: 1, _id: 0 } } // _id is excluded
  );
  // if null, return 0, otherwise return the chatCount
  return doc?.chatCount ?? 0;
}
