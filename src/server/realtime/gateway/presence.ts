import { findConversationPartnerIds } from '../../models';
import { connections, liveFilter, type Connection } from './store';
import { sendConnection, sendUser, userOnline } from './delivery';

export async function announcePresence(userId: string): Promise<void> {
  const online = await userOnline(userId);
  const partners = await findConversationPartnerIds(userId);
  await Promise.all(partners.map((id) => sendUser(id, 'presence:changed', { userId, online })));
}
export async function readyConnection(connection: Connection): Promise<void> {
  await connections().updateOne({ _id: connection._id }, { $set: { ready: true } });
  const partners = await findConversationPartnerIds(connection.userId);
  const statuses = await Promise.all(partners.map(userOnline));
  await sendConnection(connection._id, 'presence:snapshot', {
    userIds: partners.filter((_, i) => statuses[i]),
  });
  await announcePresence(connection.userId);
}
export async function staleConnections(): Promise<Connection[]> {
  return connections()
    .find({ $or: [{ leaseUntil: { $lte: new Date() } }, { expiresOn: { $lte: new Date() } }] })
    .limit(100)
    .toArray();
}
export async function hasOtherTab(connection: Connection): Promise<boolean> {
  return (
    (await connections().countDocuments({
      userId: connection.userId,
      _id: { $ne: connection._id },
      ...liveFilter(),
    })) > 0
  );
}
