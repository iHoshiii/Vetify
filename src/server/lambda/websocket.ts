import { initializeLambda } from './runtime';
import { handleGateway, type GatewayEvent } from '../realtime/gateway/handler';
import { withRealtimeWork } from '../realtime/gateway/work';

export async function handler(
  event: GatewayEvent,
  context: { callbackWaitsForEmptyEventLoop: boolean }
) {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await initializeLambda();
    return await withRealtimeWork(() => handleGateway(event));
  } catch {
    console.warn('[realtime] gateway request failed');
    return { statusCode: 503 };
  }
}
