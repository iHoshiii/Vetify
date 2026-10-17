import { getDb } from '../config/db';
import { INDEX_PLAN } from './index-plan';
import { ensureIndex } from './index-maintenance';

export async function ensureIndexes(): Promise<void> {
  const db = getDb();
  for (let start = 0; start < INDEX_PLAN.length; start += 4) {
    const results = await Promise.allSettled(
      INDEX_PLAN.slice(start, start + 4).map(async ({ collection, indexes }) => {
        for (const index of indexes) await ensureIndex(db, collection, index);
      })
    );
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
}
