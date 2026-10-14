import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { insertUser, usersCollection } from '../../../models/users';
import * as recovery from '../../../models/users/password-recovery';
import * as mail from '../../../services/mail.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
const credentials = { email: 'legacy@example.com', password: 'Sup3rSecret!' };
beforeAll(startTestDb, 120_000);
beforeEach(() => {
  env.MAIL_TRANSPORT = 'log';
  mail.clearRecentMail();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

function requestLink(email = credentials.email) {
  return request(app).post('/api/v1/auth/forgot-password').send({ email });
}

function reset() {
  const link = mail
    .recentMail()
    .at(-1)!
    .text.match(/https?:\/\/\S+/)![0];
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get('token');
  return request(app)
    .post('/api/v1/auth/reset-password')
    .send({ token, password: 'N3wPassword!', confirmPassword: 'N3wPassword!' });
}

describe('recovery account status and delivery errors', () => {
  it('recovers a retained password after a local account links a social identity', async () => {
    const user = await insertUser({ ...credentials, provider: 'local' });
    await usersCollection().updateOne(
      { _id: user._id },
      { $set: { provider: 'google', providerId: 'linked-google-id' } }
    );
    expect((await requestLink()).status).toBe(200);
    expect(mail.recentMail()).toHaveLength(1);
    expect((await reset()).status).toBe(200);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...credentials, password: 'N3wPassword!' });
    expect(login.status).toBe(200);
    expect(login.body.user.provider).toBe('google');
  });

  it('recovers a legacy active account whose status field is absent', async () => {
    const user = await insertUser({ ...credentials, provider: 'local' });
    await usersCollection().updateOne({ _id: user._id }, { $unset: { status: '' } });
    expect((await requestLink()).status).toBe(200);
    expect(mail.recentMail()).toHaveLength(1);
    expect((await reset()).status).toBe(200);
  });

  it('lifts an expired suspension before issuing and consuming recovery', async () => {
    const user = await insertUser({ ...credentials, provider: 'local', status: 'suspended' });
    const expired = { status: 'suspended' as const, statusUntil: new Date(Date.now() - 1) };
    await usersCollection().updateOne({ _id: user._id }, { $set: expired });
    expect((await requestLink()).status).toBe(200);
    expect(mail.recentMail()).toHaveLength(1);
    expect((await usersCollection().findOne({ _id: user._id }))?.status).toBe('active');
    await usersCollection().updateOne({ _id: user._id }, { $set: expired });
    expect((await reset()).status).toBe(200);
    expect((await usersCollection().findOne({ _id: user._id }))?.status).toBe('active');
  });

  it('keeps delivery and cleanup failures from revealing that an account exists', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    vi.spyOn(mail, 'sendMail').mockRejectedValue(new Error('mail is offline'));
    vi.spyOn(recovery, 'clearPasswordRecovery').mockRejectedValue(new Error('database is offline'));
    const known = await requestLink();
    const unknown = await requestLink('unknown@example.com');
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
  });
});
