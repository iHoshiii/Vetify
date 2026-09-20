import { APPOINTMENT_SLOT_MINUTES } from '@shared/limits';
import type { AppointmentKind } from '@shared/schemas';
import type { ObjectId } from 'mongodb';

import {
  findAppointmentById,
  findProfessionalById,
  findUserById,
  holdsSlotFor,
  insertAppointment,
  updateAppointment,
  type AppointmentDocument,
  type AppointmentStatus,
  type ProfessionalDocument,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import {
  cancelledEmail,
  confirmedEmail,
  declinedEmail,
  requestedToClientEmail,
  requestedToProfessionalEmail,
} from './appointment-mail';
import { isOfferedSlot } from './appointment-slots';
import { deliverMail, type MailDelivery } from './mail.service';

/**
 * Booking a vet's time, and answering for it.
 *
 * Every function here moves three things together: the status, the slot hold, and the
 * email that tells the other side. A service rather than calls in a route handler for
 * the reason `reviewProfessional` is one — a booking whose status moved without its
 * hold is a slot two people own, and one whose status moved without its email is
 * somebody sitting in a waiting room.
 *
 * The guards below hold for every caller, not only the HTTP one. They are repeated in
 * the route's schemas where they can be, because a 400 with a field message is a
 * better answer than a 409, but the ones that need the stored booking can only live
 * here.
 */

/** What the vet can do to a request. Cancelling is separate: either side may do that. */
export type AppointmentDecision = 'confirmed' | 'declined' | 'completed';

/** Which status a decision may be taken from. */
const DECIDABLE_FROM: Record<AppointmentDecision, AppointmentStatus[]> = {
  // Nothing else is a request waiting on an answer.
  confirmed: ['requested'],
  declined: ['requested'],
  // A consultation has to have been agreed before it can have happened.
  completed: ['confirmed'],
};

/** Either side may call off a booking, but only one that is still ahead of them. */
const CANCELLABLE_FROM: AppointmentStatus[] = ['requested', 'confirmed'];

/**
 * The name to put in an email, for a vet.
 *
 * The name on the licence first, for the reason the interview email prefers it: it is
 * the one the listing shows and the one an owner recognises, and the account name is
 * editable from settings.
 */
function vetName(application: ProfessionalDocument, account: User | null): string {
  return application.fullName || account?.name || 'your vet';
}

function clientName(account: User | null): string {
  return account?.name || account?.email || 'A pet owner';
}

/**
 * Moves the status and the slot hold together.
 *
 * `holdsSlot` is derived from the status through the shared list rather than passed
 * in, so there is no way to write a confirmed booking that holds nothing or a
 * cancelled one that still holds its slot.
 */
async function moveTo(
  appointment: AppointmentDocument,
  status: AppointmentStatus,
  extra: {
    meetingUrl?: string | null;
    refusalReason?: string | null;
    cancelledBy?: ObjectId | null;
  } = {}
): Promise<AppointmentDocument | null> {
  return await updateAppointment(appointment._id, {
    status,
    holdsSlot: holdsSlotFor(status) ? true : null,
    decidedAt: new Date(),
    ...extra,
  });
}

export type RequestAppointmentInput = {
  /** The pet owner asking. Their id and address both come off this. */
  client: User;
  professionalId: string | ObjectId;
  kind: AppointmentKind;
  startsAt: Date;
  petName: string;
  petSpecies: string;
  reason: string;
  phone?: string | null;
};

export type RequestAppointmentResult = {
  appointment: AppointmentDocument;
  /**
   * Both emails, reported separately. The owner's is a courtesy; the vet's is the
   * request itself, and a request nobody was told about is the one failure here worth
   * surfacing differently from the other.
   */
  mail: { client: MailDelivery; professional: MailDelivery };
};

/**
 * Asks for one slot.
 *
 * The insert holds the slot, and a duplicate-key error from the unique index is left
 * to propagate: the route turns it into the 409 that says somebody else got there
 * first. Deliberately not caught and retried — the next slot is the client's choice,
 * not ours.
 *
 * Returns null for a vet who does not exist *or* is not verified. Those are one
 * answer on purpose: a stranger has no business learning that an unverified
 * application exists behind an id they guessed.
 */
export async function requestAppointment(
  input: RequestAppointmentInput
): Promise<RequestAppointmentResult | null> {
  const { client, professionalId, kind, startsAt, petName, petSpecies, reason } = input;

  const application = await findProfessionalById(professionalId);
  if (!application || application.status !== 'verified') return null;

  // A vet booking themselves would hold their own slot and email themselves twice.
  if (application.user.equals(client._id)) {
    throw AppError.badRequest('You cannot book an appointment with yourself');
  }

  // The listing shows this, so saying so plainly is not leaking anything: an owner who
  // has the page open while a vet closes their books should be told why.
  if ((application.availabilityStatus ?? 'available') !== 'available') {
    throw AppError.conflict('That vet is not taking bookings at the moment');
  }

  // The grid is generated, so a `startsAt` that is not on it was invented by whatever
  // sent it. Checked against the same function that draws the grid, so the two cannot
  // disagree about what counts as a slot.
  const offered = isOfferedSlot({
    schedule: application.weeklySchedule ?? [],
    startsAt,
    minutes: APPOINTMENT_SLOT_MINUTES,
  });

  if (!offered) {
    throw AppError.badRequest('That time is not one of the slots on offer');
  }

  const appointment = await insertAppointment({
    professional: application._id,
    professionalUser: application.user,
    client: client._id,
    kind,
    startsAt,
    // Copied onto the row, so a later change to the constant cannot rewrite the span
    // that was actually agreed.
    minutes: APPOINTMENT_SLOT_MINUTES,
    petName,
    petSpecies,
    reason,
    phone: input.phone ?? null,
  });

  const vet = await findUserById(application.user);

  const [toProfessional, toClient] = await Promise.all([
    vet
      ? deliverMail(
          requestedToProfessionalEmail({
            to: vet.email,
            name: vetName(application, vet),
            kind,
            startsAt,
            petName,
            petSpecies,
            reason,
            phone: appointment.phone,
            clientName: clientName(client),
          })
        )
      : Promise.resolve({
          delivered: false,
          deliveryError: 'That vet no longer has an account',
        }),
    deliverMail(
      requestedToClientEmail({
        to: client.email,
        name: client.name ?? '',
        kind,
        startsAt,
        petName,
        professionalName: vetName(application, vet),
      })
    ),
  ]);

  return { appointment, mail: { client: toClient, professional: toProfessional } };
}

export type DecideAppointmentInput = {
  id: string | ObjectId;
  decision: AppointmentDecision;
  /** The vet answering. Only the one the booking is with may. */
  professional: User;
  meetingUrl?: string | null;
  reason?: string | null;
};

export type DecideAppointmentResult = {
  appointment: AppointmentDocument;
  /** Null when the decision owed the owner nothing — marking one done. */
  mail: MailDelivery | null;
};

/**
 * The vet's answer: yes, no, or that it happened.
 *
 * Declining frees the slot, which is the half that matters — a no that kept the time
 * would be a no nobody else could benefit from. Confirming keeps it, and marking one
 * complete keeps it too, because that time was in fact used.
 *
 * Returns null for a booking that does not exist, so the caller answers 404 without
 * telling a missing row from a failed write.
 */
export async function decideAppointment(
  input: DecideAppointmentInput
): Promise<DecideAppointmentResult | null> {
  const { id, decision, professional, meetingUrl = null, reason = null } = input;

  const current = await findAppointmentById(id);
  if (!current) return null;

  // Not "are you a professional" — are you *this* booking's professional. A vet
  // confirming somebody else's appointment is the one thing this check is for.
  if (!current.professionalUser.equals(professional._id)) {
    throw AppError.forbidden('That is not your appointment');
  }

  if (!DECIDABLE_FROM[decision].includes(current.status)) {
    throw AppError.conflict(`An appointment that is ${current.status} cannot be ${decision}`);
  }

  const stated = reason?.trim() || null;
  if (decision === 'declined' && !stated) {
    throw AppError.badRequest('A reason is required to turn an appointment down');
  }

  const link = meetingUrl?.trim() || null;
  // Enforced here rather than in the schema because the kind is on the stored row:
  // confirming a call without saying where it happens leaves the owner holding a time
  // and nothing to click.
  if (decision === 'confirmed' && current.kind === 'virtual' && !link) {
    throw AppError.badRequest('A virtual consultation needs a link the owner can open');
  }

  const appointment = await moveTo(current, decision, {
    ...(decision === 'confirmed' ? { meetingUrl: link } : {}),
    ...(decision === 'declined' ? { refusalReason: stated } : {}),
  });

  if (!appointment) return null;

  const [owner, application] = await Promise.all([
    findUserById(appointment.client),
    findProfessionalById(appointment.professional),
  ]);

  // Nothing to send for a completion. The owner was there.
  if (decision === 'completed' || !owner) {
    return { appointment, mail: null };
  }

  const shared = {
    to: owner.email,
    name: owner.name ?? '',
    kind: appointment.kind,
    startsAt: appointment.startsAt,
    petName: appointment.petName,
    professionalName: application ? vetName(application, professional) : professional.name ?? '',
  };

  const mail = await deliverMail(
    decision === 'confirmed'
      ? confirmedEmail({ ...shared, meetingUrl: appointment.meetingUrl })
      : declinedEmail({ ...shared, reason: appointment.refusalReason ?? '' })
  );

  return { appointment, mail };
}

export type CancelAppointmentInput = {
  id: string | ObjectId;
  /** Whoever is calling it off. Either party may; nobody else may. */
  actor: User;
  reason: string;
};

export type CancelAppointmentResult = {
  appointment: AppointmentDocument;
  /** How the other side was told. Null when their account is gone. */
  mail: MailDelivery | null;
};

/**
 * Either side calling it off, and the slot going back on the grid.
 *
 * One function for both sides rather than two, because the move is identical: the
 * status, the hold, and an email to whoever did not do it. What differs is only the
 * address it goes to, and `cancelledBy` is what the email reads to name the right
 * person — a message saying "your appointment was cancelled" without saying by whom
 * leaves the recipient wondering whether they did it themselves.
 */
export async function cancelAppointment(
  input: CancelAppointmentInput
): Promise<CancelAppointmentResult | null> {
  const { id, actor, reason } = input;

  const current = await findAppointmentById(id);
  if (!current) return null;

  const byClient = current.client.equals(actor._id);
  const byProfessional = current.professionalUser.equals(actor._id);

  if (!byClient && !byProfessional) {
    throw AppError.forbidden('That is not your appointment');
  }

  const stated = reason.trim();
  if (!stated) {
    throw AppError.badRequest('A reason is required to cancel an appointment');
  }

  // A declined or already-cancelled booking holds nothing, and a completed one has
  // happened — there is no version of "cancel" that means anything for those.
  if (!CANCELLABLE_FROM.includes(current.status)) {
    throw AppError.conflict(`An appointment that is ${current.status} cannot be cancelled`);
  }

  const appointment = await moveTo(current, 'cancelled', {
    refusalReason: stated,
    cancelledBy: actor._id,
  });

  if (!appointment) return null;

  // The one who did not do it. Read off the row rather than from a flag the caller
  // passes, so there is no way to email the wrong side.
  const other = await findUserById(byClient ? appointment.professionalUser : appointment.client);
  if (!other) return { appointment, mail: null };

  const mail = await deliverMail(
    cancelledEmail({
      to: other.email,
      name: other.name ?? '',
      kind: appointment.kind,
      startsAt: appointment.startsAt,
      petName: appointment.petName,
      cancelledByName: actor.name || actor.email,
      reason: stated,
      // Changes only the closing line: a vet is told their schedule is open again,
      // an owner is pointed at the grid to pick another.
      forProfessional: byClient,
    })
  );

  return { appointment, mail };
}
