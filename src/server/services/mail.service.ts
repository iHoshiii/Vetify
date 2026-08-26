import { env, isProduction, isTest } from '../config/env';

/**
 * A message on its way out. `text` is required and `html` is not: the plain body
 * is the one every client renders, and an invite link that only exists inside a
 * <a href> is a link some recipients cannot follow.
 */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Raised when a message could not be handed to the provider. Callers on the
 * invite path record the token first and send second, so catching this means
 * "the invite exists but nobody received it" — worth a distinct response so an
 * admin retries the send instead of wondering whether the click registered.
 */
export class MailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailError';
  }
}

/** A slow provider must not hold a request open until the client gives up. */
const HTTP_TIMEOUT_MS = 10_000;

const OUTBOX_LIMIT = 20;
const outbox: MailMessage[] = [];

/**
 * The last few messages this process produced, newest last. Tests read it to
 * assert on what an invite actually said without standing up a mail server.
 */
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

/**
 * Posts the Resend body shape: `{ from, to: [], subject, text, html }`. Any
 * provider accepting the same fields behind a bearer token works by pointing
 * MAIL_API_URL at it, which is the whole reason this is a bare fetch and not an
 * SDK.
 */
async function postMessage(message: MailMessage): Promise<void> {
  if (!env.MAIL_API_KEY) {
    throw new MailError('MAIL_TRANSPORT is http but MAIL_API_KEY is not set');
  }

  const host = new URL(env.MAIL_API_URL).host;
  let response: Response;
  try {
    response = await fetch(env.MAIL_API_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.MAIL_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
  } catch (err) {
    throw new MailError(`${host} did not answer: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 200) || response.statusText;
    throw new MailError(`${host} refused the message: ${response.status} ${detail}`);
  }
}

let warnedAboutLogTransport = false;

/**
 * Prints the whole message, body included, so a developer can read the invite
 * and click its link straight out of the terminal.
 */
function logMessage(message: MailMessage): void {
  if (isProduction && !warnedAboutLogTransport) {
    warnedAboutLogTransport = true;
    // A deployment that forgot MAIL_TRANSPORT would otherwise drop every invite
    // in silence, and the applicant waiting on it has no way to tell.
    console.warn('[mail] MAIL_TRANSPORT is log in production: nothing is being delivered');
  }
  console.log(`[mail] to ${message.to} — ${message.subject}\n${message.text}`);
}

/**
 * Sends one message, or throws {@link MailError} trying. Deliberately not
 * fire-and-forget: the caller knows whether a failed send is worth telling the
 * user about, and the invite path very much is.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  remember(message);

  if (env.MAIL_TRANSPORT === 'http') {
    await postMessage(message);
    return;
  }

  // Tests read recentMail() instead; printing every message would bury the run.
  if (!isTest) logMessage(message);
}
