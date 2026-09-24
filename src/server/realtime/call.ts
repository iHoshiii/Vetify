import type { Socket } from 'socket.io';

import { findAppointmentById, isValidObjectId, type AppointmentDocument } from '../models';
import { iceServers, type IceServer } from './ice';

// The join window opens a quarter-hour before the slot and closes when the slot ends.
const JOIN_LEAD_MS = 15 * 60_000;

// What the server hands back on a join attempt: the relays and this caller's role, or why it refused.
type CallJoinAck =
  | { ok: true; iceServers: IceServer[]; peerOnline: boolean; polite: boolean }
  | { ok: false; error: string };

function callRoom(appointmentId: string): string {
  return `call:${appointmentId}`;
}

// The booking a caller may join right now, or null. Guards kind, status, party, and the time window.
export async function loadJoinableCall(
  userId: string,
  appointmentId: string
): Promise<AppointmentDocument | null> {
  if (!isValidObjectId(appointmentId)) return null;

  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) return null;
  if (appointment.kind !== 'virtual' || appointment.status !== 'confirmed') return null;

  const isParty =
    userId === appointment.client.toString() || userId === appointment.professionalUser.toString();
  if (!isParty) return null;

  const start = appointment.startsAt.getTime();
  const now = Date.now();
  if (now < start - JOIN_LEAD_MS || now > start + appointment.minutes * 60_000) return null;
  return appointment;
}

// The same gate the button enforces, re-checked here so a hand-crafted socket cannot skip it.
export async function canJoinCall(userId: string, appointmentId: string): Promise<boolean> {
  return (await loadJoinableCall(userId, appointmentId)) !== null;
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
  // Read before joining, so the ack tells this caller whether the other party is already waiting.
  const peerOnline = size > 0;
  await socket.join(room);
  socket.to(room).emit('call:peer-joined');
  ack?.({ ok: true, iceServers: iceServers(), peerOnline, polite });
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
