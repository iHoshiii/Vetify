import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../../../config/env';
import { emailVerificationsCollection } from '../../../models/email-verifications';
import { hashToken } from '../../../models/refresh-token';
import { findUserByEmail, insertUser, usersCollection } from '../../../models/users';
import { recentMail } from '../../../services/mail.service';
import { EMAIL_VERIFICATION_EXPIRY_MS } from '../../../services/email-verification.service';
import {
  app,
  confirm,
  credentials,
  resend,
  setupVerificationTests,
  signup,
  verificationToken,
} from './email-verification-fixtures';

setupVerificationTests();

describe('email verification lifecycle', () => {
  it('automatically sends signup a private hashed one-use link without exposing token metadata', async () => {
    const response = await signup();
    expect(response.status).toBe(200);
    expect(response.body.user.emailVerified).toBe(false);
    const user = (await findUserByEmail(credentials.email))!;
    const stored = (await emailVerificationsCollection().findOne({ _id: user._id }))!;
    const token = verificationToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.hash).toBe(hashToken(token));
    expect(stored.expiresAt.getTime() - stored.requestedAt.getTime()).toBeLessThanOrEqual(
      EMAIL_VERIFICATION_EXPIRY_MS
    );
    expect(stored.expiresAt.getTime() - stored.requestedAt.getTime()).toBeGreaterThan(
      EMAIL_VERIFICATION_EXPIRY_MS - 1000
    );
    const link = new URL(recentMail()[0].text.match(/https?:\/\/\S+/)![0]);
    expect(link.origin).toBe(new URL(env.CLIENT_ORIGIN).origin);
    expect(link.pathname).toBe('/verify-email');
    expect(link.search).toBe('');
    const exported = await request(app)
      .get('/api/v1/account/export')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(exported.status).toBe(200);
    for (const value of [response.body, user, exported.body]) {
      expect(JSON.stringify(value)).not.toContain(stored.hash);
      expect(JSON.stringify(value)).not.toContain(token);
      expect(value).not.toHaveProperty('emailVerification');
    }
    expect(await usersCollection().findOne({ _id: user._id })).not.toHaveProperty(
      'emailVerification'
    );
  });

  it('allows only one confirmation, verifies only its account, and preserves existing sessions', async () => {
    const response = await signup();
    const other = await insertUser({ ...credentials, email: 'other@example.com' });
    const token = verificationToken();
    const confirmations = await Promise.all([confirm(token), confirm(token)]);
    expect(confirmations.map((reply) => reply.status).sort()).toEqual([200, 400]);
    expect(confirmations.find((reply) => reply.status === 200)?.body).toEqual({
      message: 'Your email has been verified.',
      verified: true,
    });
    expect((await findUserByEmail(credentials.email))?.emailVerified).toBe(true);
    expect((await usersCollection().findOne({ _id: other._id }))?.emailVerified).toBe(false);
    const active = await request(app)
      .get('/api/v1/account/preferences')
      .set('Authorization', `Bearer ${response.body.accessToken}`);
    expect(active.status).toBe(200);
    expect((await confirm(token)).status).toBe(400);
  });

  it('rejects expired, unknown, and malformed links', async () => {
    await signup();
    const token = verificationToken();
    await emailVerificationsCollection().updateOne(
      { hash: hashToken(token) },
      { $set: { expiresAt: new Date(Date.now() - 1) } }
    );
    expect((await confirm(token)).status).toBe(400);
    expect((await confirm('f'.repeat(64))).status).toBe(400);
    expect((await confirm('invalid')).status).toBe(400);
    expect((await findUserByEmail(credentials.email))?.emailVerified).toBe(false);
  });

  it('requires sign-in to resend and keeps unverified account login available', async () => {
    await signup();
    expect((await request(app).post('/api/v1/auth/email-verification/request')).status).toBe(401);
    const login = await request(app).post('/api/v1/auth/login').send(credentials);
    expect(login.status).toBe(200);
    expect(login.body.user.emailVerified).toBe(false);
    expect((await resend(login.body.accessToken)).status).toBe(429);
  });
});
