import type { ObjectId } from 'mongodb';

import type {
  AppointmentDocument,
  AppointmentPage,
  AppointmentParty,
  AppointmentView,
} from './types';

/**
 * A booking as one of its two parties reads it.
 *
 * `viewer` decides which account is "the other one" and whether a cancellation was
 * theirs. One shape serves both consoles for the reason one shape serves the enquiry
 * queue: the facts are the same, and a second type would be a second place to
 * remember what a booking is allowed to expose.
 *
 * `endsAt` is computed rather than stored. It is `startsAt` plus the minutes the
 * booking was made with, so a stored copy would be a second thing to keep in step
 * with a value that never changes anyway.
 */
export function toAppointmentView(input: {
  appointment: AppointmentDocument;
  viewer: ObjectId;
  /** The account on the other side, or null if it has since been deleted. */
  party: AppointmentParty | null;
}): AppointmentView {
  const { appointment, viewer, party } = input;

  return {
    id: appointment._id.toString(),
    kind: appointment.kind,
    status: appointment.status,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: new Date(appointment.startsAt.getTime() + appointment.minutes * 60_000).toISOString(),
    minutes: appointment.minutes,
    petName: appointment.petName,
    petSpecies: appointment.petSpecies,
    reason: appointment.reason,
    phone: appointment.phone,
    meetingUrl: appointment.meetingUrl,
    refusalReason: appointment.refusalReason,
    cancelledByYou: appointment.cancelledBy?.equals(viewer) ?? false,
    with: party,
    professionalId: appointment.professional.toString(),
    decidedAt: appointment.decidedAt?.toISOString() ?? null,
    createdAt: appointment.createdAt.toISOString(),
  };
}

/** A page of bookings, paged like every other list in the app. */
export function toAppointmentPage(input: {
  items: AppointmentDocument[];
  viewer: ObjectId;
  /** The other party for each booking, by the account id that is not the viewer's. */
  parties: Map<string, AppointmentParty>;
  total: number;
  page: number;
  limit: number;
}): AppointmentPage {
  const { items, viewer, parties, total, page, limit } = input;

  return {
    items: items.map((appointment) =>
      toAppointmentView({
        appointment,
        viewer,
        party: parties.get(otherPartyId(appointment, viewer)) ?? null,
      })
    ),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

/**
 * Which of the two accounts on a booking is not the one reading it.
 *
 * Exported because the route needs the same answer to know which accounts to fetch,
 * and computing it in two places is how the list ends up showing somebody their own
 * name in the "with" column.
 */
export function otherPartyId(appointment: AppointmentDocument, viewer: ObjectId): string {
  return appointment.client.equals(viewer)
    ? appointment.professionalUser.toString()
    : appointment.client.toString();
}
