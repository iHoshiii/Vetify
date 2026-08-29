import { env } from '../config/env';
import type { MailMessage } from './mail.service';

/**
 * The parts every Vetify email is built from: the greeting, the sign-off, the way a
 * date is written, and the HTML half derived from the text.
 *
 * Extracted from `professional-mail` when the appointment emails arrived. Two mail
 * modules with two copies of the HTML builder are two things to keep in step, and the
 * one that would quietly drift is the escaping.
 */

/** Where a recipient is sent when they need a person rather than a form. */
export function contactLink(): string {
  return `${env.CLIENT_ORIGIN}/contact`;
}

const SIGN_OFF = '— The Vetify team';

/**
 * Philippine time, spelled out. A time rendered in UTC is a time somebody misses by
 * eight hours, and every recipient of these is in one zone.
 */
export const MANILA_DATE = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeZone: 'Asia/Manila',
});

export const MANILA_DATE_TIME = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
});

/** Addressing someone by their full legal name reads like a summons. */
export function firstName(name: string): string {
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
 * The HTML half, derived from the text rather than written twice: blank lines become
 * paragraphs, everything is escaped, and bare links become anchors.
 *
 * Two hand-written bodies are two bodies to keep in step, and the one that has to be
 * right is the text — it is what a plain-text client, a screen reader and the `log`
 * transport all show.
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
export function compose(to: string, subject: string, text: string): MailMessage {
  const body = `${text.trim()}\n\n${SIGN_OFF}\n`;
  return { to, subject, text: body, html: htmlFromText(body) };
}
