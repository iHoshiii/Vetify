import { MongoClient } from 'mongodb';
import { dnsFallbackHint } from '../dns';
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

// Atlas intermittently answers the TLS handshake with alert 80, so bound a retry rather than let one blip strand the whole server in degraded mode.
const CONNECT_RETRIES = 4;
const RETRY_BASE_MS = 500;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// execute the connectDb function to connect to the database
export async function connectDb(uri: string = env.MONGODB_URI): Promise<boolean> {
  if (state.client) return state.serverResponding;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
    const mongoClient = createMongoClient(uri);
    try {
      await mongoClient.connect();
      await mongoClient.db().command({ ping: 1 });
      state.client = mongoClient;
      state.database = mongoClient.db();
      state.serverResponding = true;
      console.log(`[db] connected to ${state.database.databaseName}`);
      return true;
    } catch (err) {
      lastErr = err as Error;
      await mongoClient.close().catch(() => {});
      if (attempt < CONNECT_RETRIES) {
        console.warn(
          `[db] connect attempt ${attempt} failed (${lastErr.message.split('\n')[0]}), retrying`
        );
        await wait(RETRY_BASE_MS * attempt);
      }
    }
  }

  // A resolver that cannot answer SRV queries strands a container as easily as a laptop, so name that cause before the production branch.
  const hint = dnsFallbackHint(lastErr as Error);
  if (hint) console.warn(hint);
  if (isProduction) throw lastErr as Error;
  console.warn(
    `[db] could not reach Mongo after ${CONNECT_RETRIES} attempts (${
      lastErr?.message.split('\n')[0]
    }).\n` + '[db] continuing without a database, DB-backed routes will fail until it is up.'
  );
  return false;
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
