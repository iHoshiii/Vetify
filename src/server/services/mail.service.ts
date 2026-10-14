import { env, isProduction, isTest } from '../config/env';
import { MailError, postMailMessage, type MailProvider } from './mail-http';

export { MailError, type MailProvider } from './mail-http';

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

function professionalMailProvider(): MailProvider {
  return {
    transport: env.MAIL_TRANSPORT,
    apiUrl: env.MAIL_API_URL,
    apiKey: env.MAIL_API_KEY,
    from: env.MAIL_FROM,
    transportName: 'MAIL_TRANSPORT',
    keyName: 'MAIL_API_KEY',
  };
}

const warnedLogTransports = new Set<string>();

/**
 * Prints the whole message, body included, so a developer can read the invite
 * and click its link straight out of the terminal.
 */
function logMessage(message: MailMessage, provider: MailProvider): void {
  if (isProduction && !warnedLogTransports.has(provider.transportName)) {
    warnedLogTransports.add(provider.transportName);
    console.warn(
      `[mail] ${provider.transportName} is log in production: nothing is being delivered`
    );
  }
  console.log(`[mail] to ${message.to} — ${message.subject}\n${message.text}`);
}

/**
 * Sends one message, or throws {@link MailError} trying. Deliberately not
 * fire-and-forget: the caller knows whether a failed send is worth telling the
 * user about, and the invite path very much is.
 */
export async function sendMail(
  message: MailMessage,
  provider: MailProvider = professionalMailProvider()
): Promise<void> {
  remember(message);

  if (provider.transport === 'http') {
    await postMailMessage(message, provider);
    return;
  }

  // Tests read recentMail() instead; printing every message would bury the run.
  if (!isTest) logMessage(message, provider);
}

export type MailDelivery = { delivered: boolean; deliveryError: string | null };

/**
 * Sends, and reports rather than throws when the provider will not take it.
 *
 * For callers that have already written the thing the email is about. Unwinding a
 * recorded decision because a mail server was down would be the wrong repair — the
 * invitation is real either way — so the failure comes back as a flag the caller
 * can pass to whoever is watching, instead of an exception that would have to
 * pretend the decision never happened.
 *
 * Anything that is not a {@link MailError} still throws: a bug in a template is
 * not a delivery problem and should not be reported as one.
 */
export async function deliverMail(
  message: MailMessage,
  provider?: MailProvider
): Promise<MailDelivery> {
  try {
    await sendMail(message, provider);
    return { delivered: true, deliveryError: null };
  } catch (err) {
    if (!(err instanceof MailError)) throw err;
    console.warn(`[mail] ${message.to} did not receive "${message.subject}": ${err.message}`);
    return { delivered: false, deliveryError: err.message };
  }
}
