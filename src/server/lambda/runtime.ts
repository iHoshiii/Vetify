import { connectDb, isDbConnected } from '../config/db';
import { env } from '../config/env';
import { applyDnsServers } from '../config/dns';
import { ensureRealtimeIndexes } from '../realtime/gateway/store';
import { ensureTicketIndexes } from '../realtime/gateway/tickets';
import { configureGatewayTransport } from '../realtime/gateway/transport';
import { ensureIndexes } from '../models';

let initializing: Promise<void> | undefined;
export async function initializeLambda(): Promise<void> {
  initializing ??= (async () => {
    if (!env.REALTIME_MANAGEMENT_ENDPOINT)
      throw new Error('REALTIME_MANAGEMENT_ENDPOINT is required for Lambda');
    configureGatewayTransport(env.REALTIME_MANAGEMENT_ENDPOINT);
    applyDnsServers(env.DNS_SERVERS);
    if (!(await connectDb())) throw new Error('MongoDB unavailable');
    await ensureIndexes();
    await ensureRealtimeIndexes();
    await ensureTicketIndexes();
  })().catch((error) => {
    initializing = undefined;
    throw error;
  });
  await initializing;
  if (!isDbConnected()) throw new Error('MongoDB unavailable');
}
