import { PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES } from '@shared/limits';

import { env } from '../config/env';
import type { MailMessage } from './mail.service';
import { compose, contactLink, firstName, MANILA_DATE, MANILA_DATE_TIME } from './mail-template';

/**
 * Where the emailed link points. Built from CLIENT_ORIGIN, which is the browser's
 * address for this deployment — the API's own SERVER_URL would send an applicant
 * to a JSON endpoint.
 */
export function applyLink(token: string): string {
  return `${env.CLIENT_ORIGIN}/professionals/apply/${token}`;
}

export type InviteEmailInput = {
  to: string;
  name: string;
  token: string;
  expiresAt: Date;
  /** Anything the reviewer wanted the applicant to read first. */
  note?: string | null;
};

/**
 * Stage two's invitation: the link, and what to have in hand before opening it.
 *
 * The list is not padding. The form wants three photographs taken on the spot and
 * a location read from the device, all inside one sitting, and an applicant who
 * starts it on a desktop with their PRC card in another bag has to start again.
 */
export function inviteEmail(input: InviteEmailInput): MailMessage {
  const note = input.note?.trim();

  const text = [
    `Hi ${firstName(input.name)},`,
    'Thank you for writing in. We have read your enquiry and would like you to complete the professional application.',
    note ? `A note from the reviewer: ${note}` : null,
    'Open this link to fill it in:',
    applyLink(input.token),
    'Have these ready before you start, because the form asks for all of them in one sitting:',
    [
      '- your phone, for a photograph of your face taken there and then (an upload will not do)',
      '- your PRC licence card, photographed front and back',
      '- the address you want on file, opened from a device you are actually at',
    ].join('\n'),
    `Each photograph has to be less than ${PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES} minutes old when you submit, so take them as you go rather than the night before.`,
    `The link is yours alone, works once, and stops working on ${MANILA_DATE.format(
      input.expiresAt
    )}. If it lapses before you get to it, ask us for another at ${contactLink()}.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return compose(input.to, 'Your Vetify professional application link', text);
}

/**
 * The answer nobody wants, without the reviewer's reason.
 *
 * The reason on the record is written for colleagues — "licence not found on the
 * PRC roll" is a note to an admin, not a sentence to send to a stranger. What the
 * recipient needs is the decision, plainly, and the door left open.
 *
 * {@link rejectedEmail} one stage later does the opposite on purpose: by then the
 * reason is already on the applicant's own dashboard, so keeping it out of the
 * email would only make them sign in to read what we had decided to tell them.
 */
export function declineEmail(input: { to: string; name: string }): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    'Thank you for your interest in joining Vetify. After reviewing your enquiry we are not taking it further at this time.',
    `This is not a judgement on your practice, and you are welcome to write in again if your details change. If you think something was missed, tell us at ${contactLink()}.`,
  ].join('\n\n');

  return compose(input.to, 'About your Vetify enquiry', text);
}

/**
 * The booked conversation. Sent when a reviewer moves an application to
 * 'interview', which is the status that means "we have read it and want to talk".
 */
export function interviewEmail(input: {
  to: string;
  name: string;
  at: Date;
  note?: string | null;
}): MailMessage {
  const note = input.note?.trim();

  const text = [
    `Hi ${firstName(input.name)},`,
    'Your Vetify application is through its first review and we would like to talk.',
    `Interview: ${MANILA_DATE_TIME.format(input.at)} (Philippine time)`,
    note ? note : null,
    `Your application stays exactly as it is until after we speak. To move the time, or if the slot no longer works, tell us at ${contactLink()}.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  return compose(input.to, 'Your Vetify interview', text);
}

/**
 * The verdict at the end of stage two: verified, listed, and what that unlocks.
 *
 * The three things named are the three the applicant can actually go and do — the
 * directory listing, the dashboard, and the numbers on it that are theirs to set.
 * The last paragraph exists because the submission is frozen once filed: an
 * applicant whose clinic moves has to be told to write in rather than left hunting
 * for a form the dashboard deliberately does not offer.
 */
export function verifiedEmail(input: { to: string; name: string }): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    'Your Vetify application is approved. Your licence checked out against the register, and your profile is live in the directory now — pet owners can find you and book with you.',
    'Signing in gets you a professional dashboard: the appointments booked with you, your conversations, your history, and the profile the directory shows. Your rate, availability and weekly schedule are yours to set from there.',
    `If anything we verified changes — your licence, your clinic, where you practise — tell us at ${contactLink()} rather than editing around it.`,
  ].join('\n\n');

  return compose(input.to, 'Your Vetify application is approved', text);
}

/**
 * The refusal at the end of stage two, carrying the reviewer's reason.
 *
 * Deliberately unlike {@link declineEmail} one stage earlier, which withholds it.
 * By this point the reason is not a private note: a rejected application shows
 * `rejectionReason` on the applicant's own dashboard, so leaving it out of the
 * email only makes them sign in to read what we already decided to tell them. The
 * route will not record a rejection without one, so there is always something to
 * quote.
 *
 * Set off under its own label rather than folded into a sentence, because it is the
 * reviewer talking and not the site: "licence not found on the PRC roll" reads as a
 * finding when it is attributed and as a taunt when it is not.
 */
export function rejectedEmail(input: { to: string; name: string; reason: string }): MailMessage {
  const text = [
    `Hi ${firstName(input.name)},`,
    'We have finished reviewing your Vetify application and are not able to verify your licence at this time.',
    `What the reviewer noted:\n${input.reason.trim()}`,
    `This is not permanent. If that is something you can answer — a clearer photograph of your PRC card, a licence number we mis-read, a correction to your clinic details — tell us at ${contactLink()} and we will look again.`,
  ].join('\n\n');

  return compose(input.to, 'About your Vetify application', text);
}
