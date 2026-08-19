import mongoose from 'mongoose';

import { dnsFallbackHint } from './dns';
import { env, isProduction } from './env';

// Reject writes that don't match a schema path instead of silently dropping them.
mongoose.set('strictQuery', true);

/**
 * Connects to Mongo. Resolves false instead of throwing when the server is
 * unreachable in development, so routes with no DB dependency (chat, health)
 * still come up without a local Mongo. In production an unreachable database
 * is a misconfiguration, so it throws and the process exits.
 */
export async function connectDb(): Promise<boolean> {
  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });

  try {
    await mongoose.connect(env.MONGODB_URI, {
      // Fail fast in dev when Mongo isn't running; the 30s default just looks hung.
      serverSelectionTimeoutMS: isProduction ? 30_000 : 5_000,
      // Surface "no Mongo" as an immediate error rather than a 10s buffered hang.
      bufferCommands: isProduction,
    });
  } catch (err) {
    // Printed before the production branch on purpose: a resolver that cannot
    // answer SRV queries strands a container just as easily as a laptop, and the
    // bare ECONNREFUSED names nothing that would point at the cause.
    const hint = dnsFallbackHint(err as Error);
    if (hint) console.warn(hint);

    if (isProduction) throw err;
    console.warn(
      `[db] could not reach Mongo (${(err as Error).message.split('\n')[0]}).\n` +
        '[db] continuing without a database — DB-backed routes will fail until it is up.'
    );
    return false;
  }

  const { host, name } = mongoose.connection;
  console.log(`[db] connected to ${host}/${name}`);
  return true;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.connection.close();
}
