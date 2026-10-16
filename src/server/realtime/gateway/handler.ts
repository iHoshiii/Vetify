import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { activeSessionUser } from '../../services/session-access.service';
import { requireVerifiedEmail } from '../../services/email-verification-access';
import { consumeTicket } from './tickets';
import { connections, lease, acceptEvent } from './store';
import { authenticateConnection, processEvent } from './events';
import { gatewayTransport } from './transport';
import { sendConnection } from './delivery';
import { removeConnection } from './calls';

export type GatewayEvent = {
  requestContext: { routeKey: string; connectionId: string };
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
};
export async function handleGateway(event: GatewayEvent): Promise<{ statusCode: number }> {
  const { routeKey, connectionId } = event.requestContext;
  if (routeKey === '$connect') {
    const origin = Object.entries(event.headers ?? {}).find(
      ([name]) => name.toLowerCase() === 'origin'
    )?.[1];
    if (origin !== env.CLIENT_ORIGIN) return { statusCode: 403 };
    const session = await consumeTicket(event.queryStringParameters?.ticket ?? '');
    if (!session) return { statusCode: 401 };
    try {
      requireVerifiedEmail(await activeSessionUser(session.userId, session.sessionVersion));
    } catch {
      return { statusCode: 401 };
    }
    const previous = await connections()
      .find({ userId: session.userId, clientId: session.clientId })
      .toArray();
    for (const old of previous) {
      await gatewayTransport().close(old._id);
      await removeConnection(old);
    }
    await connections().insertOne({
      ...session,
      _id: connectionId,
      leaseUntil: lease(session.expiresAt),
      expiresOn: new Date(session.expiresAt),
      ready: false,
      window: 0,
      received: 0,
    });
    return { statusCode: 200 };
  }
  const connection = await connections().findOne({ _id: connectionId });
  if (!connection) {
    if (routeKey !== '$disconnect') await gatewayTransport().close(connectionId);
    return { statusCode: routeKey === '$disconnect' ? 200 : 410 };
  }
  if (routeKey === '$disconnect') {
    await removeConnection(connection);
    return { statusCode: 200 };
  }
  if (connection.leaseUntil.getTime() <= Date.now()) {
    await gatewayTransport().close(connectionId);
    await removeConnection(connection);
    return { statusCode: 410 };
  }
  if (event.isBase64Encoded || !event.body || Buffer.byteLength(event.body) > 30_000)
    return { statusCode: 400 };
  let message: { event?: unknown; payload?: unknown; requestId?: unknown };
  try {
    message = JSON.parse(event.body);
  } catch {
    return { statusCode: 400 };
  }
  if (
    !message ||
    typeof message.event !== 'string' ||
    (message.requestId !== undefined &&
      (typeof message.requestId !== 'string' || message.requestId.length > 100))
  )
    return { statusCode: 400 };
  if (!(await acceptEvent(connectionId))) {
    if (message.requestId)
      await gatewayTransport().send(connectionId, {
        requestId: message.requestId,
        error: 'rate limited',
      });
    return { statusCode: 429 };
  }
  try {
    await authenticateConnection(connection);
  } catch (error) {
    if (!(error instanceof AppError) && !(error instanceof Error && error.message === 'expired'))
      return { statusCode: 503 };
    const reason = error instanceof Error && error.message === 'expired' ? 'expired' : 'restricted';
    await sendConnection(connectionId, 'session:ended', { reason });
    await gatewayTransport().close(connectionId);
    await removeConnection(connection);
    return { statusCode: 401 };
  }
  try {
    const payload = await processEvent(connection, message.event, message.payload);
    if (message.requestId)
      await gatewayTransport().send(connectionId, { requestId: message.requestId, payload });
  } catch {
    if (message.requestId)
      await gatewayTransport().send(connectionId, {
        requestId: message.requestId,
        error: 'Realtime action failed',
      });
    console.warn('[realtime] event failed');
    return { statusCode: 500 };
  }
  return { statusCode: 200 };
}
