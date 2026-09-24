import type { Socket } from 'socket.io';

import { findAppointmentById, isValidObjectId } from '../models';
import { iceServers, type IceServer } from './ice';

// The join window opens a quarter-hour before the slot and closes when the slot ends.
const JOIN_LEAD_MS = 15 * 60_000;

// What the server hands back on a join attempt: the relays to use, or why it refused.
type CallJoinAck =
  | { ok: true; iceServers: IceServer[]; peerOnline: boolean }
  | { ok: false; error: string };

function callRoom(appointmentId: string): string {
  return `call:${appointmentId}`;
}

// The same gate the button enforces, re-checked here so a hand-crafted socket cannot skip it.
// Must be a confirmed virtual booking, the caller one of its two parties, and now inside the window.
export async function canJoinCall(userId: string, appointmentId: string): Promise<boolean> {
  if (!isValidObjectId(appointmentId)) return false;

  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) return false;
  if (appointment.kind !== 'virtual' || appointment.status !== 'confirmed') return false;

  const isParty =
    userId === appointment.client.toString() || userId === appointment.professionalUser.toString();
  if (!isParty) return false;

  const start = appointment.startsAt.getTime();
  const now = Date.now();
  return now >= start - JOIN_LEAD_MS && now <= start + appointment.minutes * 60_000;
}

async function join(
  socket: Socket,
  userId: string,
  payload: unknown,
  ack?: (result: CallJoinAck) => void
): Promise<void> {
  const appointmentId = (payload as { appointmentId?: unknown })?.appointmentId;
  if (typeof appointmentId !== 'string' || !(await canJoinCall(userId, appointmentId))) {
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

  // Read before joining, so the ack tells this caller whether the other party is already waiting.
  const peerOnline = size > 0;
  await socket.join(room);
  socket.to(room).emit('call:peer-joined');
  ack?.({ ok: true, iceServers: iceServers(), peerOnline });
}

// Blind relay of SDP and ICE to the other member, but only from a socket that joined this room.
function relaySignal(socket: Socket, payload: unknown): void {
  const data = payload as { appointmentId?: unknown; signal?: unknown };
  if (typeof data?.appointmentId !== 'string') return;

  const room = callRoom(data.appointmentId);
  if (!socket.rooms.has(room)) return;
  socket.to(room).emit('call:signal', { signal: data.signal });
}

function leave(socket: Socket, payload: unknown): void {
  const appointmentId = (payload as { appointmentId?: unknown })?.appointmentId;
  if (typeof appointmentId !== 'string') return;

  const room = callRoom(appointmentId);
  socket.to(room).emit('call:peer-left');
  void socket.leave(room);
}

// Wires the call signaling onto one connected socket. Called once per connection from socket.ts.
export function registerCall(socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on('call:join', (payload: unknown, ack?: (result: CallJoinAck) => void) => {
    void join(socket, userId, payload, ack).catch(() => ack?.({ ok: false, error: 'join failed' }));
  });
  socket.on('call:signal', (payload: unknown) => relaySignal(socket, payload));
  socket.on('call:leave', (payload: unknown) => leave(socket, payload));

  // A dropped tab still in a call: tell the peer before Socket.IO clears the room.
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room.startsWith('call:')) socket.to(room).emit('call:peer-left');
    }
  });
}
