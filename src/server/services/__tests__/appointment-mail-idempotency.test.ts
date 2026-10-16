import { afterEach, expect, it, vi } from 'vitest';
import { env } from '../../config/env';
import { sendMail } from '../mail.service';

const initial = { transport: env.MAIL_TRANSPORT, apiKey: env.MAIL_API_KEY };
afterEach(() => {
  env.MAIL_TRANSPORT = initial.transport;
  env.MAIL_API_KEY = initial.apiKey;
  vi.unstubAllGlobals();
});

it('passes the stable delivery key in the provider header and keeps it out of the email body', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  env.MAIL_TRANSPORT = 'http';
  env.MAIL_API_KEY = 're_synthetic_test_key';
  await sendMail({
    to: 'vet@example.com',
    subject: 'Appointment',
    text: 'Your appointment is confirmed.',
    idempotencyKey: 'appointment/one',
  });
  const options = fetch.mock.calls[0][1] as RequestInit;
  expect(new Headers(options.headers).get('Idempotency-Key')).toBe('appointment/one');
  expect(JSON.parse(String(options.body))).not.toHaveProperty('idempotencyKey');
});
