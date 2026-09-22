import type { Socket } from 'socket.io';

import { findConversationPartnerIds, type ThreadDocument } from '../models';
import { emitToUser, isUserOnline, userRoom } from './hub';

type PresenceEvent = { userId: string; online: boolean };

function emitPresence(recipient: string, presence: PresenceEvent): void {
  emitToUser(recipient, 'presence:changed', presence);
}

async function announceOnline(socket: Socket, userId: string): Promise<void> {
  await socket.join(userRoom(userId));
  if (!socket.connected) return;
  const partners = await findConversationPartnerIds(userId);
  if (!socket.connected) return;
  socket.emit('presence:snapshot', {
    userIds: partners.filter((partner) => isUserOnline(partner)),
  });
  for (const partner of partners) emitPresence(partner, { userId, online: true });
}

async function announceOffline(userId: string): Promise<void> {
  if (isUserOnline(userId)) return;
  const partners = await findConversationPartnerIds(userId);
  if (isUserOnline(userId)) return;
  for (const partner of partners) emitPresence(partner, { userId, online: false });
}

export function trackPresence(socket: Socket, userId: string): void {
  socket.on('disconnect', () => void announceOffline(userId).catch(() => undefined));
  void announceOnline(socket, userId).catch(() => undefined);
}

export function syncThreadPresence(thread: ThreadDocument): void {
  const client = thread.client.toString();
  const professional = thread.professionalUser.toString();
  emitPresence(client, { userId: professional, online: isUserOnline(professional) });
  emitPresence(professional, { userId: client, online: isUserOnline(client) });
}
