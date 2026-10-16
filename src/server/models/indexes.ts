import { getDb } from '../config/db';
import { INDEX_PLAN } from './index-plan';
import { ensureIndex } from './index-maintenance';

export async function ensureIndexes(): Promise<void> {
  const db = getDb();
  for (const { collection, indexes } of INDEX_PLAN) {
    for (const index of indexes) {
      await ensureIndex(db, collection, index);
    }
  }
}
