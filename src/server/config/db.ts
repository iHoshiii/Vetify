import { MongoClient, type Db } from 'mongodb';

import { env, isProduction } from './env';

/**
 * One client for the process. The driver pools connections internally, so a
 * second client would mean a second pool competing for the same server rather
 * than any extra throughput.
 */
let client: MongoClient | null = null;
let database: Db | null = null;

/**
 * Tracked here because the driver has no `readyState`. Heartbeat events are the
 * supported way to know whether the server is currently answering, which the
 * health route reports and the anonymous quota consults before deciding whether
 * to fail open.
 */
let serverResponding = false;

export type DbStatus = 'connected' | 'disconnected' | 'uninitialized';

/**
 * Connects to Mongo. Resolves false instead of throwing when the server is
 * unreachable in development, so routes with no DB dependency (chat, health)
 * still come up without a local Mongo. In production an unreachable database
 * is a misconfiguration, so it throws and the process exits.
 *
 * `uri` is a parameter rather than always `env.MONGODB_URI` so tests can point
 * the same code at an ephemeral server.
 */
export async function connectDb(uri: string = env.MONGODB_URI): Promise<boolean> {
  if (client) return serverResponding;

  const next = new MongoClient(uri, {
    // Fail fast in dev when Mongo isn't running; the 30s default just looks hung.
    // Unlike Mongoose there is no command buffering to disable — the driver
    // queues an operation only for as long as server selection is allowed to
    // take, then rejects it, which is the behaviour the old `bufferCommands:
    // false` was approximating.
    serverSelectionTimeoutMS: isProduction ? 30_000 : 5_000,
    retryWrites: true,
  });

  next.on('serverHeartbeatSucceeded', () => {
    if (!serverResponding) {
      serverResponding = true;
      console.log('[db] server responding');
    }
  });

  next.on('serverHeartbeatFailed', (event) => {
    if (serverResponding) {
      serverResponding = false;
      console.error(`[db] heartbeat failed: ${event.failure.message}`);
    }
  });

  next.on('topologyClosed', () => {
    serverResponding = false;
  });

  // An unhandled 'error' event on an emitter takes the process down, so this
  // listener exists even though the operation-level rejection is what callers
  // actually see.
  next.on('error', (err) => {
    console.error('[db] client error:', err.message);
  });

  try {
    await next.connect();
    // connect() resolves once a server has been selected; the ping is what
    // proves the credentials and database name actually work.
    await next.db().command({ ping: 1 });
  } catch (err) {
    await next.close().catch(() => {});
    if (isProduction) throw err;
    console.warn(
      `[db] could not reach Mongo (${(err as Error).message.split('\n')[0]}).\n` +
        '[db] continuing without a database — DB-backed routes will fail until it is up.'
    );
    return false;
  }

  client = next;
  // No argument: the database from the connection string, so the name stays in
  // configuration rather than being hard-coded here.
  database = next.db();
  serverResponding = true;

  console.log(`[db] connected to ${database.databaseName}`);
  return true;
}

/**
 * The `Db` handle, for callers that need `command`, `collections`, or a
 * collection this codebase has no module for. Throws rather than returning null
 * so a missing connection surfaces at the call site instead of as a downstream
 * `undefined`.
 */
export function getDb(): Db {
  if (!database) {
    throw new Error('Database is not connected. Call connectDb() before querying.');
  }
  return database;
}

/** The underlying client, for sessions and transactions. */
export function getClient(): MongoClient {
  if (!client) {
    throw new Error('Database is not connected. Call connectDb() first.');
  }
  return client;
}

/**
 * Whether a query issued right now stands a chance. False both before the first
 * connect and after the server stops answering heartbeats.
 */
export function isDbConnected(): boolean {
  return database !== null && serverResponding;
}

export function dbStatus(): DbStatus {
  if (!database) return 'uninitialized';
  return serverResponding ? 'connected' : 'disconnected';
}

export async function disconnectDb(): Promise<void> {
  if (!client) return;
  await client.close();
  client = null;
  database = null;
  serverResponding = false;
}
