import request from 'supertest';
import crypto from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { env } from '../../../config/env';
import { emailVerificationsCollection } from '../../../models/email-verification';
import { clearRecentMail, recentMail } from '../../../services/mail.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { app } from './native-auth-fixtures';

const originalMail = {
  MAIL_TRANSPORT: env.MAIL_TRANSPORT,
  MAIL_API_KEY: env.MAIL_API_KEY,
  MAIL_API_URL: env.MAIL_API_URL,
  MAIL_FROM: env.MAIL_FROM,
  AUTH_MAIL_TRANSPORT: env.AUTH_MAIL_TRANSPORT,
  AUTH_MAIL_API_KEY: env.AUTH_MAIL_API_KEY,
  AUTH_MAIL_API_URL: env.AUTH_MAIL_API_URL,
  AUTH_MAIL_FROM: env.AUTH_MAIL_FROM,
};
export const mailFetch = vi.fn();
export const PASSWORD = 'Sup3rSecret!';
export type AuthSurface = '' | '/native';
export const signup = (email = 'verify@example.com', surface: AuthSurface = '/native') =>
  request(app)
    .post(`/api/v1/auth${surface}/signup`)
    .send({ email, name: 'Verify Owner', password: PASSWORD, confirmPassword: PASSWORD });
export const verify = (token: string, code: unknown, surface: AuthSurface = '/native') =>
  request(app)
    .post(`/api/v1/auth${surface}/email/verify`)
    .set('Authorization', `Bearer ${token}`)
    .send({ code });
export const resend = (token: string, surface: AuthSurface = '/native') =>
  request(app).post(`/api/v1/auth${surface}/email/resend`).set('Authorization', `Bearer ${token}`);
export function lastCode(): string {
  const code = recentMail()
    .at(-1)
    ?.text.match(/\b[0-9]{6}\b/)?.[0];
  expect(code).toMatch(/^[0-9]{6}$/);
  return code!;
}
export const otherCode = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');
export const challenge = (id: string) =>
  emailVerificationsCollection().findOne({ user: new ObjectId(id) });
export const allowResend = (id: string) =>
  emailVerificationsCollection().updateOne(
    { user: new ObjectId(id) },
    { $set: { resendAvailableAt: new Date(Date.now() - 1) } }
  );

export function setupVerificationDb(): void {
  beforeAll(startTestDb, 120_000);
  beforeEach(() => {
    let nextCode = 1234;
    vi.spyOn(crypto, 'randomInt').mockImplementation(() => nextCode++);
    clearRecentMail();
    Object.assign(env, {
      MAIL_TRANSPORT: 'http',
      MAIL_API_KEY: 'professional-test-key',
      MAIL_API_URL: 'https://professional.mail.test/emails',
      MAIL_FROM: 'Vetify Applications <apply@vetify.test>',
      AUTH_MAIL_TRANSPORT: 'http',
      AUTH_MAIL_API_KEY: 'verification-test-key',
      AUTH_MAIL_API_URL: 'https://mail.test/emails',
      AUTH_MAIL_FROM: 'Vetify Auth <auth@vetify.test>',
    });
    mailFetch.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', mailFetch);
  });
  afterEach(async () => {
    Object.assign(env, originalMail);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await clearTestDb();
  });
  afterAll(stopTestDb);
}

export function postedMail(index = 0): Record<string, unknown> {
  const init = mailFetch.mock.calls[index]?.[1] as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

export { app, recentMail };
