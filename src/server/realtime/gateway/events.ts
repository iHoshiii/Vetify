import { findThreadById, findUserById, isValidObjectId } from '../../models';
import { activeSessionUser } from '../../services/session-access.service';
import { requireVerifiedEmail } from '../../services/email-verification-access';
import { socketSession } from '../session';
import { callEvent } from './calls';
import { readyConnection } from './presence';
import { sendUser } from './delivery';
import { touchConnection, type Connection } from './store';

export async function authenticateConnection(connection: Connection): Promise<void> {
  if (Date.now() >= connection.expiresAt) throw new Error('expired');
  requireVerifiedEmail(await activeSessionUser(connection.userId, connection.sessionVersion));
}
export async function processEvent(
  connection: Connection,
  event: string,
  payload: unknown
): Promise<unknown> {
  await authenticateConnection(connection);
  if (event === 'session:renew') {
    const token = (payload as { token?: unknown })?.token;
    if (typeof token !== 'string') return { ok: false };
    const session = await socketSession(token);
    if (
      session.userId !== connection.userId ||
      session.sessionVersion !== connection.sessionVersion
    )
      return { ok: false };
    session.expiresAt = Math.max(session.expiresAt, connection.expiresAt);
    await touchConnection(connection._id, session);
    return { ok: true };
  }
  await touchConnection(connection._id);
  if (event === 'connection:ready') {
    await readyConnection(connection);
    return { ok: true };
  }
  if (!connection.ready) throw new Error('unauthorized');
  if (event === 'connection:heartbeat') return { ok: true, expiresAt: connection.expiresAt };
  if (event.startsWith('call:')) return callEvent(connection, event, payload);
  if (event === 'thread:typing') {
    const data = payload as { threadId?: unknown; typing?: unknown };
    if (typeof data?.threadId !== 'string' || !isValidObjectId(data.threadId))
      return { delivered: false };
    const [thread, sender] = await Promise.all([
      findThreadById(data.threadId),
      findUserById(connection.userId),
    ]);
    if (!thread || !sender) return { delivered: false };
    const client = thread.client.toString();
    const professional = thread.professionalUser.toString();
    if (![client, professional].includes(connection.userId)) return { delivered: false };
    await sendUser(connection.userId === client ? professional : client, event, {
      threadId: data.threadId,
      typing: data.typing === true,
    });
    return { delivered: true };
  }
  return { ok: false, error: 'unsupported event' };
}
