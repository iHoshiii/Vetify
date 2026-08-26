import { PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES } from '@shared/limits';

import { env } from '../config/env';
import type { MailMessage } from './mail.service';

/**
 * Where the emailed link points. Built from CLIENT_ORIGIN, which is the browser's
 * address for this deployment — the API's own SERVER_URL would send an applicant
 * to a JSON endpoint.
 */
export function applyLink(token: string): string {
  return `${env.CLIENT_ORIGIN}/professionals/apply/${token}`;
}

/** Where a recipient is sent when they need a person rather than a form. */
function contactLink(): string {
  return `${env.CLIENT_ORIGIN}/contact`;
}

const SIGN_OFF = '— The Vetify team';

/**
 * Philippine time, spelled out. An interview time rendered in UTC is a time
 * somebody misses by eight hours, and every recipient of these is in one zone.
 */
const MANILA_DATE = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeZone: 'Asia/Manila',
});

const MANILA_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

/** Addressing someone by their full legal name reads like a summons. */
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'there';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BARE_LINK = /https?:\/\/[^\s<]+/g;

/**
 * The HTML half, derived from the text rather than written twice: blank lines
 * become paragraphs, everything is escaped, and bare links become anchors.
 *
 * Two hand-written bodies are two bodies to keep in step, and the one that has to
 * be right is the text — it is what a plain-text client, a screen reader and the
 * `log` transport all show.
 */
function htmlFromText(text: string): string {
  const paragraphs = escapeHtml(text.trim())
    .split(/\n{2,}/)
    .map((block) =>
      block.replace(BARE_LINK, (url) => `<a href="${url}">${url}</a>`).replace(/\n/g, '<br />')
    )
    .map((block) => `<p style="margin:0 0 16px">${block}</p>`)
    .join('\n');

  return [
    '<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0f172a">',
    paragraphs,
    '</div>',
  ].join('\n');
}

/** Builds both bodies from one draft, so they cannot drift apart. */
function compose(to: string, subject: string, text: string): MailMessage {
  const body = `${text.trim()}\n\n${SIGN_OFF}\n`;
  return { to, subject, text: body, html: htmlFromText(body) };
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
