import type { Namespace } from 'socket.io';

const stopTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleAutoStop(nsp: Namespace, appointmentId: string, endsAt: Date): void {
  if (stopTimers.has(appointmentId)) return;
  const room = `call:${appointmentId}`;
  const fire = () => {
    stopTimers.delete(appointmentId);
    nsp.to(room).emit('call:ended', { reason: 'ended' });
    void nsp.in(room).socketsLeave(room);
  };
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) {
    fire();
    return;
  }
  const timer = setTimeout(fire, ms);
  timer.unref();
  stopTimers.set(appointmentId, timer);
}
