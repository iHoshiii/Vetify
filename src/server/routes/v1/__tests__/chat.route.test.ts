import { FREE_ANON_QUERIES } from '@shared/limits';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../../app';
import { ANON_ID_COOKIE } from '../../../services/anon-quota';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

// Keeps Gemini out of the test entirely — the point here is the gate in front of
// it, and a real call would cost money and need a key.
vi.mock('../../../services/chat.service', () => ({
  generateReply: vi.fn().mockResolvedValue('a mock reply'),
}));

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const ask = (agent: request.Agent) => agent.post('/api/v1/chat').send({ message: 'is my dog ok?' });

describe('POST /api/v1/chat anonymous allowance', () => {
  it('sets a signed anonymous cookie on the first question', async () => {
    const res = await ask(request.agent(app));

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    const anon = cookies.find((c) => c.startsWith(`${ANON_ID_COOKIE}=`));

    expect(anon).toBeDefined();
    expect(anon).toContain('HttpOnly');
    // `<id>.<signature>` — a bare id would be forgeable.
    expect(decodeURIComponent(anon!.split(';')[0].split('=')[1])).toContain('.');
  });

  it('counts down across requests and refuses the one after the allowance', async () => {
    const agent = request.agent(app);

    for (let i = 1; i <= FREE_ANON_QUERIES; i++) {
      const res = await ask(agent);
      expect(res.status).toBe(200);
      expect(res.body.reply).toBe('a mock reply');
      expect(res.body.anonRemaining).toBe(FREE_ANON_QUERIES - i);
    }

    const refused = await ask(agent);
    expect(refused.status).toBe(429);
    expect(refused.body.reason).toBe('anon-quota');
    expect(refused.body.reply).toBeUndefined();
  });

  it('gives a visitor with no cookie their own allowance', async () => {
    const first = request.agent(app);
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await ask(first);
    expect((await ask(first)).status).toBe(429);

    // Different agent, no cookie jar in common.
    expect((await ask(request.agent(app))).status).toBe(200);
  });

  it('does not spend the allowance on a request it refuses', async () => {
    const agent = request.agent(app);
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await ask(agent);

    const first = await ask(agent);
    const second = await ask(agent);

    expect(first.status).toBe(429);
    expect(second.status).toBe(429);
    expect(second.body.reason).toBe('anon-quota');
  });
});

describe('POST /api/v1/chat signed in', () => {
  const token = signAccessToken({ sub: '507f1f77bcf86cd799439011', email: 'ada@example.com' });

  it('is not subject to the anonymous allowance', async () => {
    const agent = request.agent(app);

    for (let i = 0; i < FREE_ANON_QUERIES + 5; i++) {
      const res = await agent
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'hello' });

      expect(res.status).toBe(200);
      // No countdown is reported, because none is being kept.
      expect(res.body.anonRemaining).toBeUndefined();
    }
  });

  it('falls back to the anonymous allowance when the token is junk', async () => {
    const agent = request.agent(app);

    const res = await agent
      .post('/api/v1/chat')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ message: 'hello' });

    expect(res.status).toBe(200);
    expect(res.body.anonRemaining).toBe(FREE_ANON_QUERIES - 1);
  });
});
