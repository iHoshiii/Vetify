import { FREE_ANON_QUERIES } from '@shared/limits';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../../app';
import {
  activityEventsCollection,
  flushActivity,
  type ActivityEventDocument,
  type ActivityType,
} from '../../../models/activity-event';
import { insertUser } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

// Same reason as the chat route's own tests: the gate is what matters here, and a
// real Gemini call would cost money and need a key.
vi.mock('../../../services/chat.service', () => ({
  generateReply: vi.fn().mockResolvedValue('a mock reply'),
}));

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  // The writes are fire-and-forget, so one still in flight would otherwise land
  // in the next test's collection.
  await flushActivity();
  await clearTestDb();
});
afterAll(stopTestDb);

const CREDENTIALS = { email: 'ada@example.com', password: 'Sup3rSecret!' };

const SIGNUP = {
  name: 'Ada',
  email: 'new@example.com',
  password: 'Sup3rSecret!',
  confirmPassword: 'Sup3rSecret!',
};

/** Every event logged so far, in the order it was written. */
async function events(): Promise<ActivityEventDocument[]> {
  await flushActivity();
  return activityEventsCollection().find({}).sort({ createdAt: 1 }).toArray();
}

async function types(): Promise<ActivityType[]> {
  return (await events()).map((event) => event.type);
}

describe('auth activity', () => {
  it('logs a signup against the account it just created', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(SIGNUP);
    expect(res.status).toBe(200);

    const [event] = await events();
    expect(event).toMatchObject({
      type: 'user.signed_up',
      metadata: { provider: 'local' },
    });
    expect(event.user?.toString()).toBe(res.body.user.id);
  });

  it('logs a login with the provider it came through', async () => {
    const user = await insertUser({ ...CREDENTIALS, provider: 'local' });

    await request(app).post('/api/v1/auth/login').send(CREDENTIALS);

    const [event] = await events();
    expect(event).toMatchObject({ type: 'user.logged_in', metadata: { provider: 'local' } });
    expect(event.user).toEqual(user._id);
  });

  it('logs nothing for a login that was refused', async () => {
    await insertUser({ ...CREDENTIALS, provider: 'local' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...CREDENTIALS, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(await types()).toEqual([]);
  });

  it('attributes a logout to the caller when the access token is still good', async () => {
    const user = await insertUser({ ...CREDENTIALS, provider: 'local' });
    const agent = request.agent(app);
    const login = await agent.post('/api/v1/auth/login').send(CREDENTIALS);

    await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken as string}`);

    expect(await types()).toEqual(['user.logged_in', 'user.logged_out']);
    expect((await events())[1].user).toEqual(user._id);
  });

  it('still logs out an expired session, without an event to attribute', async () => {
    // `optionalAuth` never rejects, which is the point: the logout has to work for
    // someone whose access token died before they clicked it. There is just
    // nobody to credit the event to.
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.loggedOut).toBe(true);
    expect(await types()).toEqual([]);
  });
});

describe('chat activity', () => {
  const ask = (agent: request.Agent) =>
    agent.post('/api/v1/chat').send({ message: 'is my dog ok?' });

  it('logs an anonymous question against the quota cookie, not a user', async () => {
    await ask(request.agent(app));

    const [event] = await events();
    expect(event).toMatchObject({
      type: 'chat.message_sent',
      user: null,
      metadata: { model: 'gemini-3.5-flash' },
    });
    // The id the allowance already counts them by, so one visitor's conversation
    // stays one visitor's without a second cookie.
    expect(event.anonId).toBeTruthy();
  });

  it('logs a signed-in question against the user and no anon id', async () => {
    const user = await insertUser({ ...CREDENTIALS, provider: 'local' });
    const token = signAccessToken({
      sub: user._id.toString(),
      email: user.email,
      role: 'user',
    });

    await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'hello' });

    const [event] = await events();
    expect(event.user).toEqual(user._id);
    expect(event.anonId).toBeNull();
  });

  it('logs nothing for a question turned away at the allowance', async () => {
    const agent = request.agent(app);
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await ask(agent);

    const refused = await ask(agent);
    expect(refused.status).toBe(429);

    // One per answered question and no more — the refused one never reached the
    // model, so counting it would overstate usage on the chart.
    expect(await types()).toHaveLength(FREE_ANON_QUERIES);
  });
});
