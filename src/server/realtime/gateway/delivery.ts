import { activeSessionUser } from '../../services/session-access.service';
import { requireVerifiedEmail } from '../../services/email-verification-access';
import { AppError } from '../../utils/AppError';
import { removeConnection } from './calls';
import { connections, liveFilter, type Connection } from './store';
import { gatewayTransport } from './transport';

export async function validConnection(connection: Connection): Promise<boolean> {
  try {
    if (connection.expiresAt <= Date.now()) return false;
    requireVerifiedEmail(await activeSessionUser(connection.userId, connection.sessionVersion));
    return true;
  } catch (error) {
    if (error instanceof AppError) return false;
    throw error;
  }
}
export async function sendConnection(id: string, event: string, payload?: unknown): Promise<void> {
  if (!(await gatewayTransport().send(id, { event, payload }))) {
    const connection = await connections().findOne({ _id: id });
    if (connection) await removeConnection(connection);
  }
}
export async function deliver(
  connection: Connection,
  event: string,
  payload?: unknown
): Promise<void> {
  if (!(await validConnection(connection))) {
    await sendConnection(connection._id, 'session:ended', { reason: 'restricted' });
    await gatewayTransport().close(connection._id);
    await removeConnection(connection);
    return;
  }
  await sendConnection(connection._id, event, payload);
}
export async function sendUser(userId: string, event: string, payload: unknown): Promise<void> {
  const targets = await connections()
    .find({ userId, ...liveFilter() })
    .toArray();
  await Promise.all(targets.map((connection) => deliver(connection, event, payload)));
}
export async function userOnline(userId: string): Promise<boolean> {
  const targets = await connections()
    .find({ userId, ...liveFilter() })
    .toArray();
  const validity = await Promise.all(targets.map(validConnection));
  return validity.some(Boolean);
}
export async function closeUser(userId: string, beforeSessionVersion?: number): Promise<void> {
  const targets = await connections()
    .find({
      userId,
      ...(beforeSessionVersion === undefined
        ? {}
        : { sessionVersion: { $lt: beforeSessionVersion } }),
    })
    .toArray();
  await Promise.all(
    targets.map(async (connection) => {
      await sendConnection(connection._id, 'session:ended', { reason: 'restricted' });
      await gatewayTransport().close(connection._id);
      await removeConnection(connection);
    })
  );
}
