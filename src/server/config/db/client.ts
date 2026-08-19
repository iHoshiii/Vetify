import { MongoClient } from 'mongodb';
import { env, isProduction } from '../env';
import { attachHeartbeatListeners } from './listeners';
import { state } from './state';

// time given for the system to find and connect to an active database server;
// if it takes longer than this, it throws an error
export function createMongoClient(uri: string): MongoClient {
  const mongoClient = new MongoClient(uri, {
    serverSelectionTimeoutMS: isProduction ? 30_000 : 5_000, // 30 seconds for production, 5 seconds for test/development
    retryWrites: true, // automatically retries write operations (insert, update, delete) once if a temporary network drop occurs
  });

  // call the attachHeartbeatListeners function from listeners.ts
  attachHeartbeatListeners(mongoClient);
  return mongoClient;
}

// execute the connectDb function to connect to the database
// Promise<boolean> is used to indicate that the function returns a promise that resolves to a boolean value, indicating whether the connection was successful or not.
export async function connectDb(uri: string = env.MONGODB_URI): Promise<boolean> {
  if (state.client) return state.serverResponding;

  const mongoClient = createMongoClient(uri);

  try {
    await mongoClient.connect(); // wait for the 'mongoClient' to connect to the mongoClient
    await mongoClient.db().command({ ping: 1 }); // tries to command a ping to the 'mongoClient' db
  } catch (err) {
    await mongoClient.close().catch(() => {}); // if error 'mongoClient' will be closed
    if (isProduction) throw err; // if its currently in production
    console.warn(
      `[db] could not reach Mongo (${(err as Error).message.split('\n')[0]}).\n` +
        '[db] continuing without a database — DB-backed routes will fail until it is up.'
    );
    return false;
  }

  // if mongoClient is connected/responding, execute this
  state.client = mongoClient;
  state.database = mongoClient.db();
  state.serverResponding = true;

  console.log(`[db] connected to ${state.database.databaseName}`);
  return true;
}

// if mongoClient is NOT connected/responding, execute this
// even if the value of Promise is void / null / undefined
export async function disconnectDb(): Promise<void> {
  if (!state.client) return;
  await state.client.close();
  state.client = null;
  state.database = null;
  state.serverResponding = false;
}
