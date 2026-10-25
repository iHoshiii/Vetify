import { FREE_ANON_QUERIES } from '@shared/limits';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../../app';
import { ANON_ID_COOKIE } from '../../../services/anon-quota';
import { signAccessToken } from '../../../services/auth.service';
import { insertUser } from '../../../models/users';
import { activityEventsCollection, flushActivity } from '../../../models/activity-event';
import { OUT_OF_SCOPE_REPLY } from '../../../services/chat-scope';
import { CHAT_SCOPE_CASES } from '../../../test-utils/chat-scope-cases';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { AppError } from '../../../utils/AppError';

// Keeps Bedrock out of the test; real generation requires AWS access and incurs usage charges.
const { generateReply } = vi.hoisted(() => ({
  generateReply: vi.fn().mockResolvedValue('a mock reply'),
}));
vi.mock('../../../services/chat.service', () => ({ generateReply }));
const { isVeterinaryTopic } = vi.hoisted(() => ({
  isVeterinaryTopic: vi.fn().mockResolvedValue(true),
}));
vi.mock('../../../services/chat-topic.service', () => ({ isVeterinaryTopic }));

const app = createApp();

beforeAll(startTestDb, 120_000);
beforeEach(() => vi.clearAllMocks());
afterEach(async () => {
  await flushActivity();
  await clearTestDb();
});
afterAll(stopTestDb);

const ask = (agent: request.Agent) => agent.post('/api/v1/chat').send({ message: 'is my dog ok?' });

describe('POST /api/v1/chat anonymous allowance', () => {
  it('refuses non-veterinary messages after a pet-care conversation without calling AI', async () => {
    isVeterinaryTopic.mockResolvedValueOnce(false);
    const res = await request(app)
      .post('/api/v1/chat')
      .send({
        message: 'Tell me a law from the Philippines.',
        history: [
          { role: 'user', content: 'My dog is scratching a lot.' },
          { role: 'assistant', content: 'Check for fleas and irritated skin.' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBe(OUT_OF_SCOPE_REPLY);
    expect(generateReply).not.toHaveBeenCalled();
  });

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

describe('POST /api/v1/chat scope decisions', () => {
  // Mocked classifier results verify routing, context forwarding, and activity
  // counts. The separate live suite measures real semantic classification.
  it.each(CHAT_SCOPE_CASES)(
    '$label (allowed=$allowed)',
    async ({ message, history = [], allowed }) => {
      isVeterinaryTopic.mockResolvedValueOnce(allowed);
      const res = await request(app).post('/api/v1/chat').send({ message, history });

      expect(res.status).toBe(200);
      expect(isVeterinaryTopic).toHaveBeenCalledTimes(1);
      expect(isVeterinaryTopic).toHaveBeenCalledWith(message, history);
      expect(res.body.reply).toBe(allowed ? 'a mock reply' : OUT_OF_SCOPE_REPLY);
      if (allowed) {
        expect(generateReply).toHaveBeenCalledTimes(1);
        expect(generateReply).toHaveBeenCalledWith(expect.objectContaining({ message, history }));
      } else {
        expect(generateReply).not.toHaveBeenCalled();
      }
      await flushActivity();
      expect(await activityEventsCollection().countDocuments({ type: 'chat.message_sent' })).toBe(
        allowed ? 1 : 0
      );
    }
  );

  it('returns a retryable service error without generating or logging an unchecked answer', async () => {
    isVeterinaryTopic.mockRejectedValueOnce(
      new AppError(503, 'The AI service is unavailable right now. Please try again.')
    );
    const res = await request(app).post('/api/v1/chat').send({ message: 'Dog anatomy' });

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('The AI service is unavailable right now. Please try again.');
    expect(res.body.reply).toBeUndefined();
    expect(generateReply).not.toHaveBeenCalled();
    expect(await activityEventsCollection().countDocuments({})).toBe(0);
  });
});

describe('POST /api/v1/chat signed in', () => {
  it('is not subject to the anonymous allowance', async () => {
    const user = await insertUser({ email: 'ada@example.com', provider: 'google' });
    const token = signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' });
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
