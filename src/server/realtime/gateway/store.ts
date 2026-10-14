import { getDb } from '../../config/db';
import type { SocketSession } from '../session';

export type Connection = SocketSession & {
  _id: string;
  clientId: string;
  leaseUntil: Date;
  expiresOn: Date;
  ready: boolean;
  window: number;
  received: number;
};
export type Membership = {
  _id: string;
  appointmentId: string;
  userId: string;
  connectionId: string;
  leaseUntil: Date;
  endsAt: Date;
};
export const connections = () => getDb().collection<Connection>('realtimeconnections');
export const memberships = () => getDb().collection<Membership>('realtimecallmembers');
export const liveFilter = () => ({
  leaseUntil: { $gt: new Date() },
  expiresOn: { $gt: new Date() },
  ready: true,
});
export const memberFilter = () => ({
  leaseUntil: { $gt: new Date() },
  endsAt: { $gt: new Date() },
});
export const lease = (expiresAt: number) => new Date(Math.min(expiresAt, Date.now() + 90_000));

export async function ensureRealtimeIndexes(): Promise<void> {
  await Promise.all([
    connections().createIndex({ leaseUntil: 1 }, { expireAfterSeconds: 300 }),
    connections().createIndex({ userId: 1 }),
    memberships().createIndex({ leaseUntil: 1 }, { expireAfterSeconds: 300 }),
    memberships().createIndex({ appointmentId: 1, userId: 1 }, { unique: true }),
    memberships().createIndex({ connectionId: 1 }),
  ]);
}

export async function touchConnection(id: string, session?: SocketSession): Promise<void> {
  const current = await connections().findOne({ _id: id });
  if (!current) throw new Error('unauthorized');
  const expiresAt = session?.expiresAt ?? current.expiresAt;
  const leaseUntil = lease(expiresAt);
  await connections().updateOne(
    { _id: id },
    { $set: { ...session, expiresOn: new Date(expiresAt), leaseUntil } }
  );
  await memberships().updateMany({ connectionId: id, ...memberFilter() }, { $set: { leaseUntil } });
}

export async function acceptEvent(id: string): Promise<boolean> {
  const window = Math.floor(Date.now() / 60_000);
  const updated = await connections().findOneAndUpdate(
    { _id: id, $or: [{ window: { $ne: window } }, { received: { $lt: 180 } }] },
    [
      {
        $set: {
          window,
          received: { $cond: [{ $eq: ['$window', window] }, { $add: ['$received', 1] }, 1] },
        },
      },
    ],
    { returnDocument: 'after' }
  );
  return updated !== null;
}

export async function claimMembership(
  connection: Connection,
  appointmentId: string,
  endsAt: Date
): Promise<boolean> {
  await memberships().deleteMany({
    appointmentId,
    $or: [{ leaseUntil: { $lte: new Date() } }, { endsAt: { $lte: new Date() } }],
  });
  const _id = `${appointmentId}:${connection.userId}`;
  try {
    await memberships().updateOne(
      { _id, connectionId: connection._id },
      {
        $set: {
          appointmentId,
          userId: connection.userId,
          connectionId: connection._id,
          endsAt,
          leaseUntil: lease(connection.expiresAt),
        },
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
}
