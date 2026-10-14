import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { ensureEmailVerificationIndexes } from '../../../models/email-verifications';
import { clearRecentMail, recentMail } from '../../../services/mail.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

export const app = createApp();
export const credentials = { email: 'verify@example.com', password: 'Sup3rSecret!' };

export function setupVerificationTests() {
  const transport = env.MAIL_TRANSPORT;
  beforeAll(async () => {
    await startTestDb();
    await ensureEmailVerificationIndexes();
  }, 120_000);
  beforeEach(() => {
    env.MAIL_TRANSPORT = 'log';
    clearRecentMail();
  });
  afterEach(async () => {
    env.MAIL_TRANSPORT = transport;
    vi.restoreAllMocks();
    clearRecentMail();
    await clearTestDb();
  });
  afterAll(stopTestDb);
}

export function signup(email = credentials.email) {
  return request(app).post('/api/v1/auth/signup').send({
    email,
    password: credentials.password,
    confirmPassword: credentials.password,
    name: 'Ada',
  });
}

export function verificationToken(text = recentMail().at(-1)!.text): string {
  const link = new URL(text.match(/https?:\/\/\S+/)![0]);
  return new URLSearchParams(link.hash.slice(1)).get('token')!;
}

export function confirm(token: string) {
  return request(app).post('/api/v1/auth/email-verification/confirm').send({ token });
}

export function resend(accessToken: string) {
  return request(app)
    .post('/api/v1/auth/email-verification/request')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({});
}
