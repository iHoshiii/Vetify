import { io, type Socket } from 'socket.io-client';
import { GatewaySocket } from './gateway-socket';

import { sendTyping } from '@/services/messages.service';

// One connection per tab. A module singleton rather than context state, so a remount does not reconnect.
let socket: Socket | null = null;
let socketToken: string | null = null;

function tokenAccount(token: string | null): string | null {
  if (!token) return null;
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(encoded)) as { sub?: string };
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

// Opens the connection, or re-authorises the existing one when the token rotates.
export function connectSocket(token: string): Socket {
  if (socket) {
    const accountChanged = socketToken !== token;
    const sameAccount =
      tokenAccount(socketToken) !== null && tokenAccount(socketToken) === tokenAccount(token);
    socketToken = token;
    socket.auth = { token };
    // Socket rooms are assigned during the handshake. Updating `auth` alone leaves
    // an existing connection in the previous account's room after an account switch.
    if (accountChanged && socket.connected) {
      if (!sameAccount) {
        socket.disconnect().connect();
        return socket;
      }
      const currentSocket = socket;
      currentSocket
        .timeout(5_000)
        .emit('session:renew', { token }, (error: Error | null, ack?: { ok: boolean }) => {
          if ((!error && ack?.ok) || socket !== currentSocket || socketToken !== token) return;
          currentSocket.disconnect().connect();
        });
    } else if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  // Same origin as the API, so the vite proxy and the deployed server both route it without extra config.
  const gatewayUrl = import.meta.env.VITE_REALTIME_URL;
  if (gatewayUrl) {
    if (!gatewayUrl.startsWith('wss://') && !gatewayUrl.startsWith('ws://localhost:'))
      throw new Error('Invalid realtime URL');
    socket = new GatewaySocket(gatewayUrl, token).connect() as unknown as Socket;
    socketToken = token;
    return socket;
  }
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
  const previous = socket;
  socket = null;
  socketToken = null;
  previous?.disconnect();
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
