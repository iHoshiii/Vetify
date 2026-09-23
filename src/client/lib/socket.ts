import { io, type Socket } from 'socket.io-client';

import { sendTyping } from '@/services/messages.service';

// One connection per tab. A module singleton rather than context state, so a remount does not reconnect.
let socket: Socket | null = null;
let socketToken: string | null = null;

// Opens the connection, or re-authorises the existing one when the token rotates.
export function connectSocket(token: string): Socket {
  if (socket) {
    const accountChanged = socketToken !== token;
    socketToken = token;
    socket.auth = { token };
    // Socket rooms are assigned during the handshake. Updating `auth` alone leaves
    // an existing connection in the previous account's room after an account switch.
    if (accountChanged && socket.connected) {
      socket.disconnect().connect();
    } else if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  // Same origin as the API, so the vite proxy and the deployed server both route it without extra config.
  socket = io({
    path: '/socket.io',
    auth: { token },
    autoConnect: true,
    // The server closes an unauthorised handshake; a token that just expired is worth one more try after a refresh.
    reconnectionAttempts: 5,
  });
  socketToken = token;

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  socketToken = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// Tells the other side of a thread whether the caller is typing. A no-op when the socket is down.
export function emitTyping(threadId: string, typing: boolean): void {
  if (!socket?.connected) {
    void sendTyping(threadId, typing).catch(() => undefined);
    return;
  }

  socket
    .timeout(1200)
    .emit(
      'thread:typing',
      { threadId, typing },
      (error: Error | null, result?: { delivered: boolean }) => {
        if (error || !result?.delivered) {
          void sendTyping(threadId, typing).catch(() => undefined);
        }
      }
    );
}
