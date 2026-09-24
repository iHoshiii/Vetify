import type { Namespace, Socket } from 'socket.io';

import { MESSAGE_MAX_LENGTH } from '@shared/limits';

import { findAppointmentById, markCallJoined, type AppointmentDocument } from '../models';
import { callPeer, effectiveCallEnd, loadJoinableCall, type CallPeer } from './call-window';
import { emitToUser } from './hub';
import { iceServers, type IceServer } from './ice';

export { canJoinCall, loadJoinableCall } from './call-window';

// What the server hands back on a join: the relays, this caller's role, the peer, and when the session ends.
type CallJoinAck =
  | {
      ok: true;
      iceServers: IceServer[];
      peerOnline: boolean;
      polite: boolean;
      endsAt: string;
      peer: CallPeer;
    }
  | { ok: false; error: string };

// Auto-stop timers by appointment id, so a live call closes itself at the session end even if nobody hangs up.
const stopTimers = new Map<string, ReturnType<typeof setTimeout>>();

function callRoom(appointmentId: string): string {
  return `call:${appointmentId}`;
}

// Tells both parties a call's presence changed, so a list not in the call refetches its ongoing state.
function announceChanged(appointment: AppointmentDocument): void {
  const payload = { id: appointment._id.toString() };
  emitToUser(appointment.client.toString(), 'appointment:changed', payload);
  emitToUser(appointment.professionalUser.toString(), 'appointment:changed', payload);
}

// Closes the room once, at the session end. Unref'd so a pending timer never holds the process open.
function scheduleAutoStop(nsp: Namespace, appointmentId: string, endsAt: Date): void {
  if (stopTimers.has(appointmentId)) return;
  const room = callRoom(appointmentId);
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

async function join(
  socket: Socket,
  userId: string,
  payload: unknown,
  ack?: (result: CallJoinAck) => void
): Promise<void> {
  const appointmentId = (payload as { appointmentId?: unknown })?.appointmentId;
  const appointment =
    typeof appointmentId === 'string' ? await loadJoinableCall(userId, appointmentId) : null;
  if (!appointment || typeof appointmentId !== 'string') {
    ack?.({ ok: false, error: 'not allowed' });
    return;
  }

  const room = callRoom(appointmentId);
  // Max two: a 1-to-1 call, never a room a third socket can eavesdrop on.
  const size = socket.nsp.adapter.rooms.get(room)?.size ?? 0;
  if (size >= 2) {
    ack?.({ ok: false, error: 'call is full' });
    return;
  }

  // The owner is the polite peer and the vet the impolite one, a fixed split perfect negotiation needs.
  const polite = userId === appointment.client.toString();
  const peerOnline = size > 0;
  await socket.join(room);
  socket.to(room).emit('call:peer-joined');

  const endsAt = await effectiveCallEnd(appointment);
  const peer = await callPeer(appointment, userId);
  await markCallJoined(appointment._id);
  announceChanged(appointment);
  scheduleAutoStop(socket.nsp, appointmentId, endsAt);

  ack?.({
    ok: true,
    iceServers: iceServers(),
    peerOnline,
    polite,
    endsAt: endsAt.toISOString(),
    peer,
  });
}

// Blind relay of SDP and ICE to the other member, but only from a socket that joined this room.
function relaySignal(socket: Socket, payload: unknown): void {
  const data = payload as { appointmentId?: unknown; signal?: unknown };
  if (typeof data?.appointmentId !== 'string') return;

  const room = callRoom(data.appointmentId);
  if (!socket.rooms.has(room)) return;
  socket.to(room).emit('call:signal', { signal: data.signal });
}

async function leave(socket: Socket, payload: unknown): Promise<void> {
  const appointmentId = (payload as { appointmentId?: unknown })?.appointmentId;
  if (typeof appointmentId !== 'string') return;

  const room = callRoom(appointmentId);
  socket.to(room).emit('call:peer-left');
  void socket.leave(room);

  const appointment = await findAppointmentById(appointmentId);
  if (appointment) announceChanged(appointment);
}

// Relays one chat line to the other member, so a muted participant can still talk. Ephemeral, never stored.
export function relayChat(socket: Socket, payload: unknown): void {
  const data = payload as { appointmentId?: unknown; text?: unknown };
  if (typeof data?.appointmentId !== 'string' || typeof data?.text !== 'string') return;

  const text = data.text.trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!text) return;

  const room = callRoom(data.appointmentId);
  if (!socket.rooms.has(room)) return;
  socket.to(room).emit('call:chat', { text });
}

// Wires the call signaling onto one connected socket. Called once per connection from socket.ts.
export function registerCall(socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on('call:join', (payload: unknown, ack?: (result: CallJoinAck) => void) => {
    void join(socket, userId, payload, ack).catch(() => ack?.({ ok: false, error: 'join failed' }));
  });
  socket.on('call:signal', (payload: unknown) => relaySignal(socket, payload));
  socket.on('call:chat', (payload: unknown) => relayChat(socket, payload));
  socket.on('call:leave', (payload: unknown) => void leave(socket, payload));

  // A dropped tab still in a call: tell the peer, and refresh both lists, before Socket.IO clears the room.
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (!room.startsWith('call:')) continue;
      socket.to(room).emit('call:peer-left');
      void findAppointmentById(room.slice('call:'.length)).then((a) => {
        if (a) announceChanged(a);
      });
    }
  });
}
