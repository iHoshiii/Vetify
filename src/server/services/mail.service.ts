import { env, isProduction, isTest } from '../config/env';

import { postMessage } from './mail-transport';
import { MailError, type MailMessage } from './mail-types';
export { MailError, type MailMessage } from './mail-types';

const OUTBOX_LIMIT = 20;
const outbox: MailMessage[] = [];

export function recentMail(): readonly MailMessage[] {
  return outbox;
}

export function clearRecentMail(): void {
  outbox.length = 0;
}

function remember(message: MailMessage): void {
  outbox.push(message);
  if (outbox.length > OUTBOX_LIMIT) outbox.shift();
}

let warnedAboutLogTransport = false;

function logMessage(message: MailMessage): void {
  if (isProduction && !warnedAboutLogTransport) {
    warnedAboutLogTransport = true;
    // A deployment that forgot MAIL_TRANSPORT would otherwise drop every invite
    // in silence, and the applicant waiting on it has no way to tell.
    console.warn('[mail] MAIL_TRANSPORT is log in production: nothing is being delivered');
  }
  console.log(`[mail] to ${message.to} — ${message.subject}\n${message.text}`);
}

export async function sendMail(message: MailMessage): Promise<void> {
  remember(message);

  if (env.MAIL_TRANSPORT === 'http') {
    await postMessage(message);
    return;
  }

  // Tests read recentMail() instead; printing every message would bury the run.
  if (!isTest) logMessage(message);
}

export type MailDelivery = { delivered: boolean; deliveryError: string | null };

export async function deliverMail(message: MailMessage): Promise<MailDelivery> {
  try {
    await sendMail(message);
    return { delivered: true, deliveryError: null };
  } catch (err) {
    if (!(err instanceof MailError)) throw err;
    console.warn(`[mail] ${message.to} did not receive "${message.subject}": ${err.message}`);
    return { delivered: false, deliveryError: err.message };
  }
}
