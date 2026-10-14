import type { Socket } from 'socket.io-client';

export function listenCall(
  socket: Pick<Socket, 'on' | 'off'>,
  appointmentId: string,
  handlers: Record<string, (payload: never) => void>
): () => void {
  const listeners = Object.entries(handlers).map(([event, handler]) => {
    const listener = (payload?: { appointmentId?: string }) => {
      if (payload?.appointmentId && payload.appointmentId !== appointmentId) return;
      handler(payload as never);
    };
    socket.on(event, listener);
    return { event, listener };
  });
  return () => {
    for (const { event, listener } of listeners) socket.off(event, listener);
  };
}
