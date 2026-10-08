import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { applyDnsServers } from './config/dns';
import { env } from './config/env';
import { ensureIndexes } from './models';

async function main() {
  if (env.NODE_ENV !== 'development') {
    throw new Error('The planner development API only runs in development.');
  }
  applyDnsServers(env.DNS_SERVERS);
  if (!(await connectDb())) throw new Error('The main system database is unavailable.');
  await ensureIndexes();
  const server = createApp().listen(env.PORT, () => {
    console.log(`[main-api] listening on http://localhost:${env.PORT}`);
  });
  server.once('error', () => {
    console.error(`[main-api] Could not listen on port ${env.PORT}.`);
    void disconnectDb().finally(() => process.exit(1));
  });
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 10_000);
    deadline.unref();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDb();
    clearTimeout(deadline);
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown().catch(() => process.exit(1)));
  process.once('SIGTERM', () => void shutdown().catch(() => process.exit(1)));
}

void main().catch(async (error: Error) => {
  console.error(`[main-api] ${error.message}`);
  await disconnectDb();
  process.exit(1);
});
