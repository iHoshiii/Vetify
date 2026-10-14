import { env } from '../config/env';
import { MailError, type MailMessage } from './mail-types';

const HTTP_TIMEOUT_MS = 10_000;

export async function postMessage(message: MailMessage): Promise<void> {
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
        ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
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
