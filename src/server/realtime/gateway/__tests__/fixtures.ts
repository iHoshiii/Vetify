import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { env } from '../../../config/env';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { type User } from '../../../models/users';
import { tokenFor, callBooking } from '../../__tests__/socket-fixtures';
import { socketSession } from '../../session';
import { issueTicket, ensureTicketIndexes } from '../tickets';
import { handleGateway, type GatewayEvent } from '../handler';
import { ensureRealtimeIndexes, connections } from '../store';
import { setGatewayTransport } from '../transport';

export { tokenFor, callBooking };
export const send = vi.fn(async (_id: string, _data: unknown) => true);
export const close = vi.fn(async (_id: string) => undefined);
export function setupGateway(): void {
  beforeAll(async () => {
    await startTestDb();
    await ensureRealtimeIndexes();
    await ensureTicketIndexes();
  });
  beforeEach(() => {
    send.mockClear();
    send.mockResolvedValue(true);
    close.mockClear();
    setGatewayTransport({ send, close });
  });
  afterEach(clearTestDb);
  afterAll(stopTestDb);
}
export function frame(
  id: string,
  event: string,
  payload: unknown = {},
  requestId = randomUUID()
): GatewayEvent {
  return {
    requestContext: { routeKey: '$default', connectionId: id },
    body: JSON.stringify({ event, payload, requestId }),
  };
}
export async function connect(
  user: User,
  id = randomUUID(),
  clientId = randomUUID()
): Promise<string> {
  const ticket = await issueTicket(await socketSession(tokenFor(user)), clientId);
  const result = await handleGateway({
    requestContext: { routeKey: '$connect', connectionId: id },
    headers: { origin: env.CLIENT_ORIGIN },
    queryStringParameters: { ticket },
  });
  if (result.statusCode !== 200) throw new Error('Connection failed');
  await handleGateway(frame(id, 'connection:ready'));
  return id;
}
export async function event(id: string, name: string, payload: unknown = {}) {
  const requestId = randomUUID();
  await handleGateway(frame(id, name, payload, requestId));
  return send.mock.calls.find(
    ([, value]) => (value as { requestId?: string }).requestId === requestId
  )?.[1] as { payload?: { ok?: boolean; error?: string; peerOnline?: boolean }; error?: string };
}
export const received = (id: string, event: string) =>
  send.mock.calls.filter(
    ([target, value]) => target === id && (value as { event?: string }).event === event
  );
export const stored = (id: string) => connections().findOne({ _id: id });
