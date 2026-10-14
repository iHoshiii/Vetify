import { initializeLambda } from './runtime';
import { maintainRealtime } from '../realtime/gateway/maintenance';
import { withRealtimeWork } from '../realtime/gateway/work';

export async function handler(
  _event: unknown,
  context: { callbackWaitsForEmptyEventLoop: boolean }
) {
  context.callbackWaitsForEmptyEventLoop = false;
  await initializeLambda();
  await withRealtimeWork(maintainRealtime);
}
