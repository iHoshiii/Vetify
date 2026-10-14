import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connectDb, disconnectDb } from '../config/db';
import { ensureIndexes } from '../models';

let replica: MongoMemoryReplSet | null = null;

export async function startReplicaTestDb(): Promise<void> {
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ launchTimeout: 60_000 }],
  });
  await connectDb(replica.getUri());
  await ensureIndexes();
}

export async function stopReplicaTestDb(): Promise<void> {
  await disconnectDb();
  await replica?.stop();
  replica = null;
}
