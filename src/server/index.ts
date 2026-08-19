import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { applyDnsServers } from './config/dns';
import { env } from './config/env';

async function main() {
  // Ahead of connectDb because a mongodb+srv:// URI is resolved the instant the
  // driver is handed it, and a resolver swap after that point comes too late.
  applyDnsServers(env.DNS_SERVERS);

  const dbUp = await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    if (!dbUp) console.log('[server] running in degraded mode: no database');
  });

  // Drain in-flight requests before closing the DB, so no handler loses its
  // connection mid-write.
  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Don't hang forever on a stuck keep-alive socket.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
