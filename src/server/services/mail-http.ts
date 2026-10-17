import type { MailMessage } from './mail.service';
import { z } from 'zod';

export type MailProvider = {
  transport: 'log' | 'http';
  apiUrl: string;
  apiKey?: string;
  from: string;
  fromName?: string;
  transportName: string;
  keyName: string;
};

export class MailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailError';
  }
}

const HTTP_TIMEOUT_MS = 10_000;

export async function postMailMessage(message: MailMessage, provider: MailProvider): Promise<void> {
  if (!provider.apiKey) {
    throw new MailError(`${provider.transportName} is http but ${provider.keyName} is not set`);
  }

  const host = new URL(provider.apiUrl).host;
  const sender = provider.from.trim();
  const address = sender.match(/^[^<>\r\n]+<([^<>\r\n]+)>$/)?.[1]?.trim() ?? sender;
  if (!z.email().safeParse(address).success) {
    const setting = provider.fromName ?? provider.transportName.replace(/_TRANSPORT$/, '_FROM');
    throw new MailError(
      `${setting} must be an email sender such as Vetify <onboarding@resend.dev>, not an API key`
    );
  }
  if (host === 'api.resend.com' && !provider.apiKey.startsWith('re_')) {
    throw new MailError(`${provider.keyName} must contain a Resend API key starting with re_`);
  }
  let response: Response;
  try {
    response = await fetch(provider.apiUrl, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${provider.apiKey}`,
        'content-type': 'application/json',
        ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: provider.from,
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
