import { MongoMemoryServer } from 'mongodb-memory-server';

import { connectDb, disconnectDb, getDb } from '../config/db';
import { ensureIndexes } from '../models';

let mongo: MongoMemoryServer | null = null;

/**
 * Boots an ephemeral mongod and points the application's own connection at it,
 * so tests exercise the same `connectDb`/`getDb` path as the server.
 *
 * Indexes are built up front rather than lazily, which is what the driver
 * requires: uniqueness is not enforced until the index exists, and Mongoose's
 * per-model `init()` no longer does it on first use.
 */
export async function startTestDb(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  await ensureIndexes();
}

export async function stopTestDb(): Promise<void> {
  await disconnectDb();
  await mongo?.stop();
  mongo = null;
}

/** Empties every collection between tests while leaving the indexes in place. */
export async function clearTestDb(): Promise<void> {
  const collections = await getDb().collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}
