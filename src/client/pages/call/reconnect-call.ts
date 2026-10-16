import type { Socket } from 'socket.io-client';

export function reconnectCall(
  socket: Pick<Socket, 'on' | 'off'>,
  options: {
    closed: () => boolean;
    reset: () => void;
    join: () => void;
  }
): () => void {
  let reconnecting = false;
  const onDisconnect = () => {
    if (options.closed()) return;
    reconnecting = true;
    options.reset();
  };
  const onConnect = () => {
    if (!reconnecting || options.closed()) return;
    reconnecting = false;
    options.join();
  };
  socket.on('disconnect', onDisconnect);
  socket.on('connect', onConnect);
  return () => {
    socket.off('disconnect', onDisconnect);
    socket.off('connect', onConnect);
  };
}
