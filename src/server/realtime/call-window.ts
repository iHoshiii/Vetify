import { APPOINTMENT_MAX_SLOTS } from '@shared/limits';

import {
  findAppointmentById,
  findConfirmedCallStartingAt,
  findUserById,
  isValidObjectId,
  type AppointmentDocument,
} from '../models';

// The join window opens a quarter-hour before the slot and closes when the session ends.
export const JOIN_LEAD_MS = 15 * 60_000;

// The other party, as the call screen names them. Role is the peer's, so each side sees who they are talking to.
export type CallPeer = { name: string | null; avatarUrl: string | null; role: 'vet' | 'owner' };

// The instant a session truly ends: its own end, extended across any back-to-back confirmed virtual bookings the same two people hold.
export async function effectiveCallEnd(appointment: AppointmentDocument): Promise<Date> {
  let end = new Date(appointment.startsAt.getTime() + appointment.minutes * 60_000);
  // Bounded by the most slots one booking can span, so a data glitch cannot loop forever.
  for (let step = 0; step < APPOINTMENT_MAX_SLOTS; step++) {
    const next = await findConfirmedCallStartingAt({
      professional: appointment.professional,
      client: appointment.client,
      startsAt: end,
    });
    if (!next) break;
    end = new Date(next.startsAt.getTime() + next.minutes * 60_000);
  }
  return end;
}

// The booking a caller may join right now, or null. Guards kind, status, party, and the window whose end follows the chain.
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
  if (now < start - JOIN_LEAD_MS) return null;
  if (now > (await effectiveCallEnd(appointment)).getTime()) return null;
  return appointment;
}

// The same gate the button enforces, re-checked here so a hand-crafted socket cannot skip it.
export async function canJoinCall(userId: string, appointmentId: string): Promise<boolean> {
  return (await loadJoinableCall(userId, appointmentId)) !== null;
}

// The peer's identity for the caller's screen. If I am the client my peer is the vet, and the reverse.
export async function callPeer(
  appointment: AppointmentDocument,
  userId: string
): Promise<CallPeer> {
  const iAmClient = userId === appointment.client.toString();
  const peer = await findUserById(iAmClient ? appointment.professionalUser : appointment.client);
  return {
    name: peer?.name ?? null,
    avatarUrl: peer?.avatarUrl ?? null,
    role: iAmClient ? 'vet' : 'owner',
  };
}
