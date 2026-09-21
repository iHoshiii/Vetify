import { io, type Socket } from 'socket.io-client';

// One connection per tab. A module singleton rather than context state, so a remount does not reconnect.
let socket: Socket | null = null;

// Opens the connection, or re-authorises the existing one when the token rotates.
export function connectSocket(token: string): Socket {
  if (socket) {
    // A refreshed token has to reach the handshake, so swap it and let socket.io reconnect with it.
    socket.auth = { token };
    if (!socket.connected) socket.connect();
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

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
