import type { Server } from 'socket.io';

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
