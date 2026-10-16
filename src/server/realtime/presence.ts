import type { Socket } from 'socket.io';

import { findConversationPartnerIds, type ThreadDocument } from '../models';
import { emitToUser, isUserOnline, userRoom } from './hub';
import { queueDelivery } from './gateway/work';

type PresenceEvent = { userId: string; online: boolean };

function emitPresence(recipient: string, presence: PresenceEvent): void {
  emitToUser(recipient, 'presence:changed', presence);
}

async function announceOnline(socket: Socket, userId: string): Promise<void> {
  await socket.join(userRoom(userId));
  if (!socket.connected) return;
  const partners = await findConversationPartnerIds(userId);
  if (!socket.connected) return;
  const online = await Promise.all(partners.map(isUserOnline));
  socket.emit('presence:snapshot', { userIds: partners.filter((_, i) => online[i]) });
  for (const partner of partners) emitPresence(partner, { userId, online: true });
}

async function announceOffline(userId: string): Promise<void> {
  if (await isUserOnline(userId)) return;
  const partners = await findConversationPartnerIds(userId);
  if (await isUserOnline(userId)) return;
  for (const partner of partners) emitPresence(partner, { userId, online: false });
}

export function trackPresence(socket: Socket, userId: string): void {
  socket.on('disconnect', () => void announceOffline(userId).catch(() => undefined));
  void announceOnline(socket, userId).catch(() => undefined);
}

export function syncThreadPresence(thread: ThreadDocument): void {
  queueDelivery(syncPresence(thread));
}
async function syncPresence(thread: ThreadDocument): Promise<void> {
  const client = thread.client.toString();
  const professional = thread.professionalUser.toString();
  emitPresence(client, { userId: professional, online: await isUserOnline(professional) });
  emitPresence(professional, { userId: client, online: await isUserOnline(client) });
}
