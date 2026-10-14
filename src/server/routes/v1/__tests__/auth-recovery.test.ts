import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { hashToken, refreshTokensCollection } from '../../../models/refresh-token';
import { findUserByEmail, insertUser, usersCollection } from '../../../models/users';
import { clearRecentMail, recentMail } from '../../../services/mail.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
const credentials = { email: 'recover@example.com', password: 'Sup3rSecret!' };
const nextPassword = 'N3wPassword!';
const transport = env.MAIL_TRANSPORT;
beforeAll(startTestDb, 120_000);
beforeEach(() => {
  env.MAIL_TRANSPORT = 'log';
  clearRecentMail();
});
afterEach(async () => {
  env.MAIL_TRANSPORT = transport;
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

function recover(email = credentials.email) {
  return request(app).post('/api/v1/auth/forgot-password').send({ email });
}
function latestToken() {
  const link = recentMail()
    .at(-1)!
    .text.match(/https?:\/\/\S+/)![0];
  return new URLSearchParams(new URL(link).hash.slice(1)).get('token')!;
}
function reset(token: string) {
  return request(app)
    .post('/api/v1/auth/reset-password')
    .send({ token, password: nextPassword, confirmPassword: nextPassword });
}

describe('password recovery', () => {
  it('answers the same way for unknown, blocked, social, and eligible accounts', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    await insertUser({ email: 'social@example.com', provider: 'google', providerId: 'google1' });
    await insertUser({
      email: 'blocked@example.com',
      password: credentials.password,
      provider: 'local',
      status: 'suspended',
    });
    const responses = await Promise.all(
      ['unknown@example.com', 'social@example.com', 'blocked@example.com', credentials.email].map(
        recover
      )
    );
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200]);
    expect(new Set(responses.map((response) => JSON.stringify(response.body))).size).toBe(1);
    expect(recentMail()).toHaveLength(1);
    const stored = await usersCollection().findOne({ email: credentials.email });
    expect(stored?.passwordReset?.hash).toBe(hashToken(latestToken()));
    expect(await findUserByEmail(credentials.email)).not.toHaveProperty('passwordReset');
  });

  it('consumes a link once, changes only its account, and ends old sign-ins', async () => {
    const owner = await insertUser({ ...credentials, provider: 'local' });
    const other = await insertUser({
      email: 'other@example.com',
      password: credentials.password,
      provider: 'local',
    });
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send(credentials);
    await recover();
    const responses = await Promise.all([reset(latestToken()), reset(latestToken())]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect((await agent.post('/api/v1/auth/refresh')).status).toBe(401);
    expect(
      (
        await request(app)
          .get('/api/v1/account/preferences')
          .set('Authorization', `Bearer ${login.body.accessToken}`)
      ).status
    ).toBe(401);
    expect((await request(app).post('/api/v1/auth/login').send(credentials)).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ ...credentials, password: nextPassword })
      ).status
    ).toBe(200);
    expect((await usersCollection().findOne({ _id: owner._id }))?.sessionVersion).toBe(1);
    expect((await usersCollection().findOne({ _id: other._id }))?.sessionVersion).toBe(0);
    expect(
      await refreshTokensCollection().countDocuments({
        user: owner._id,
        sessionVersion: 0,
        revokedAt: null,
      })
    ).toBe(0);
  });

  it('refuses expired links and accounts blocked after requesting recovery', async () => {
    const user = await insertUser({ ...credentials, provider: 'local' });
    await recover();
    const token = latestToken();
    await usersCollection().updateOne(
      { _id: user._id },
      { $set: { 'passwordReset.expiresAt': new Date(Date.now() - 1) } }
    );
    expect((await reset(token)).status).toBe(400);
    await usersCollection().updateOne(
      { _id: user._id },
      { $set: { 'passwordReset.expiresAt': new Date(Date.now() + 10_000), status: 'banned' } }
    );
    expect((await reset(token)).status).toBe(400);
  });

  it('does not send another email during the address cooldown', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    await Promise.all([recover(), recover(), recover()]);
    expect(recentMail()).toHaveLength(1);
  });

  it('clears the undelivered link and keeps the public response generic', async () => {
    await insertUser({ ...credentials, provider: 'local' });
    env.MAIL_TRANSPORT = 'http';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    const response = await recover();
    expect(response.status).toBe(200);
    expect(
      (await usersCollection().findOne({ email: credentials.email }))?.passwordReset
    ).toBeUndefined();
    expect((await reset(latestToken())).status).toBe(400);
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1);
  });
});
