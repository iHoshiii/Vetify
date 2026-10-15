import type { Db, Document, IndexDescription } from 'mongodb';

const INDEX_OPTIONS_CONFLICT = 85;

const INDEX_KEY_SPECS_CONFLICT = 86;

function conflictsWithExistingIndex(err: unknown): boolean {
  const code = (err as { code?: number }).code;
  return code === INDEX_OPTIONS_CONFLICT || code === INDEX_KEY_SPECS_CONFLICT;
}

function sameKey(a: Document, b: IndexDescription['key']): boolean {
  const left = Object.entries(a);
  const right = Object.entries(b);
  if (left.length !== right.length) return false;
  // Field order is part of a compound index's identity, so compare positionally.
  return left.every(([field, dir], i) => right[i][0] === field && right[i][1] === dir);
}

export async function ensureIndex(
  db: Db,
  collection: string,
  index: IndexDescription
): Promise<void> {
  try {
    await db.collection(collection).createIndexes([index]);
    return;
  } catch (err) {
    if (!conflictsWithExistingIndex(err)) throw err;
  }

  const existing = await db.collection(collection).indexes();
  const stale = existing.find(
    (candidate) => candidate.name !== '_id_' && sameKey(candidate.key, index.key)
  );

  if (!stale?.name)
    throw new Error(`Index conflict on ${collection} that no existing index explains`);

  console.warn(`[db] replacing stale index ${collection}.${stale.name} — its options changed`);
  await db.collection(collection).dropIndex(stale.name);
  await db.collection(collection).createIndexes([index]);
}
