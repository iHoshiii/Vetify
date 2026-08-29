import type { AppointmentKind } from '@shared/schemas';

import { env } from '../config/env';
import type { MailMessage } from './mail.service';
import { compose, contactLink, firstName, MANILA_DATE_TIME } from './mail-template';

/**
 * The four things a booking has to say, and who it says them to.
 *
 * Every one of these leads with the time, because that is the fact the recipient
 * came for: an email about an appointment that buries when it is has failed at the
 * only job it had.
 */

/** Where somebody is sent to see the booking itself. */
function bookingsLink(): string {
  return `${env.CLIENT_ORIGIN}/book-appointment`;
}

/** Where a vet is sent to answer one. */
function consoleLink(): string {
  return `${env.CLIENT_ORIGIN}/professionals/dashboard`;
}

/** How the two kinds read in a sentence. */
function kindOf(kind: AppointmentKind): string {
  return kind === 'virtual' ? 'Online consultation' : 'Clinic visit';
}

export type AppointmentEmailBase = {
  to: string;
  /** The recipient's name, for the greeting. */
  name: string;
  kind: AppointmentKind;
  startsAt: Date;
  petName: string;
};

/**
 * To the vet: somebody has asked for one of your slots.
 *
 * Carries what the decision actually turns on — the animal, the reason, and a number
 * to ring — so a vet can answer from the email without opening the console first,
 * even though the buttons are only there.
 */
export function requestedToProfessionalEmail(
  input: AppointmentEmailBase & {
    clientName: string;
    petSpecies: string;
    reason: string;
    phone: string | null;
  }
): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    `${input.clientName} has asked for an appointment.`,
    [
      `${kindOf(input.kind)}: ${MANILA_DATE_TIME.format(input.startsAt)} (Philippine time)`,
      `Pet: ${input.petName}, ${input.petSpecies}`,
      input.phone ? `Phone: ${input.phone}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    `What they wrote:\n${input.reason}`,
    `The slot is held for you until you answer. Confirm or turn it down at ${consoleLink()}.`,
  ].join('\n\n');

  return compose(input.to, `Appointment request for ${input.petName}`, text);
}

/**
 * To the owner: we have asked, and the slot is yours while you wait.
 *
 * Says the slot is held, because that is the question somebody has the moment they
 * click: whether they need to sit on the page in case somebody else takes it.
 */
export function requestedToClientEmail(
  input: AppointmentEmailBase & { professionalName: string }
): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    `Your request has gone to ${input.professionalName}.`,
    `${kindOf(input.kind)}: ${MANILA_DATE_TIME.format(input.startsAt)} (Philippine time)\nFor: ${
      input.petName
    }`,
    'That time is held for you while they answer, so nobody else can take it. We will email you either way.',
    `You can see it, or withdraw it, at ${bookingsLink()}.`,
  ].join('\n\n');

  return compose(input.to, `We have asked about ${input.petName}'s appointment`, text);
}

/**
 * To the owner: it is on.
 *
 * The link for a virtual consultation is a line of its own rather than folded into a
 * sentence — it is the thing they will come back to this email to find.
 */
export function confirmedEmail(
  input: AppointmentEmailBase & { professionalName: string; meetingUrl: string | null }
): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    `${input.professionalName} has confirmed ${input.petName}'s appointment.`,
    `${kindOf(input.kind)}: ${MANILA_DATE_TIME.format(input.startsAt)} (Philippine time)`,
    input.meetingUrl ? `Join here at the time:\n${input.meetingUrl}` : null,
    input.kind === 'onsite'
      ? 'Come to the address on their listing. Bring any records you have for the visit.'
      : null,
    `If you can no longer make it, cancel at ${bookingsLink()} rather than leaving the slot held — somebody else may want it.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return compose(input.to, `${input.petName}'s appointment is confirmed`, text);
}

/**
 * To the owner: no, with the reason.
 *
 * Unlike the enquiry decline at the professional-application stage, this carries the
 * vet's words. A refused booking is not a judgement anybody needs protecting from,
 * and "I am on leave that week" is exactly what stops the owner asking again for the
 * same day.
 */
export function declinedEmail(
  input: AppointmentEmailBase & { professionalName: string; reason: string }
): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    `${input.professionalName} is not able to take ${
      input.petName
    }'s appointment on ${MANILA_DATE_TIME.format(input.startsAt)}.`,
    `What they said:\n${input.reason.trim()}`,
    `That slot is free again, and so are their others — pick another at ${bookingsLink()}. If it is urgent, tell us at ${contactLink()}.`,
  ].join('\n\n');

  return compose(input.to, `About ${input.petName}'s appointment`, text);
}

/**
 * To whichever side did not do it.
 *
 * Named rather than "the other party": an email that says "your appointment was
 * cancelled" without saying by whom leaves the recipient wondering whether they did
 * it themselves.
 */
export function cancelledEmail(
  input: AppointmentEmailBase & {
    cancelledByName: string;
    reason: string;
    forProfessional: boolean;
  }
): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    `${input.cancelledByName} has cancelled ${
      input.petName
    }'s appointment on ${MANILA_DATE_TIME.format(input.startsAt)}.`,
    `What they said:\n${input.reason.trim()}`,
    input.forProfessional
      ? 'The slot is open again on your schedule.'
      : `The slot is free again, and you can book another at ${bookingsLink()}.`,
  ].join('\n\n');

  return compose(input.to, `${input.petName}'s appointment was cancelled`, text);
}
