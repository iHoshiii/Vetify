import type { Server } from 'socket.io';

import { markCallConnected } from '../models';

// The one io instance, set at boot. Held here so services can emit without importing the HTTP server.
let io: Server | null = null;

export function setRealtime(server: Server): void {
  io = server;
}

// Each account gets a private room, so an emit reaches every tab that account has open.
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

// Emits to one account's room. A no-op before the socket server is up, so tests and seeds do not need one.
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function isUserOnline(userId: string): boolean {
  return (io?.sockets.adapter.rooms.get(userRoom(userId))?.size ?? 0) > 0;
}

// Whether a socket sits in this booking's call room right now. The `call:` prefix mirrors callRoom in call.ts.
export function isCallLive(appointmentId: string): boolean {
  return (io?.sockets.adapter.rooms.get(`call:${appointmentId}`)?.size ?? 0) > 0;
}

// Whether two different accounts are both in this booking's call room, the mark of a real 2-way session rather than one person alone or one person in two tabs.
export function callHasBothParties(appointmentId: string): boolean {
  const ids = io?.sockets.adapter.rooms.get(`call:${appointmentId}`);
  if (!ids) return false;
  const users = new Set<string>();
  for (const id of ids) {
    const userId = io?.sockets.sockets.get(id)?.data.userId;
    if (typeof userId === 'string') users.add(userId);
  }
  return users.size >= 2;
}

// Stamps consultedAt the moment both accounts share the call room, so only a real 2-way session makes a virtual booking rateable.
export async function stampCallConnected(appointmentId: string): Promise<void> {
  if (callHasBothParties(appointmentId)) await markCallConnected(appointmentId);
}
