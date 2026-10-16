import type { Options } from 'express-rate-limit';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { LambdaRateLimitStore, lambdaRateLimitStore } from '../lambda-rate-limit-store';
import { rateLimitsCollection } from '../../models/rate-limit';
import { env } from '../../config/env';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);
const store = (scope = 'auth', windowMs = 60_000) => {
  const result = new LambdaRateLimitStore(scope);
  result.init({ windowMs } as Options);
  return result;
};

it('shares an atomic limit across independent Lambda store instances', async () => {
  const instances = [store(), store()];
  const results = await Promise.all(
    Array.from({ length: 30 }, (_, index) => instances[index % 2].increment('203.0.113.1'))
  );
  expect(results.map((result) => result.totalHits).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 30 }, (_, index) => index + 1)
  );
  const saved = await rateLimitsCollection().findOne({});
  expect(saved?._id).not.toContain('203.0.113.1');
  expect(saved?.totalHits).toBe(30);
});

it('resets an expired window without depending on asynchronous TTL deletion', async () => {
  const first = await store('auth', 1000).increment('client');
  vi.spyOn(Date, 'now').mockReturnValue(first.resetTime.getTime() + 1);
  const next = await store('auth', 1000).increment('client');
  expect(next.totalHits).toBe(1);
  expect(next.resetTime.getTime()).toBe(first.resetTime.getTime() + 1001);
});

it('keeps different limit scopes independent and supports targeted reset/decrement', async () => {
  const auth = store();
  const chat = store('chat');
  await auth.increment('client');
  await chat.increment('client');
  await auth.decrement('client');
  await auth.decrement('client');
  expect((await auth.increment('client')).totalHits).toBe(1);
  await auth.resetAll();
  expect((await chat.increment('client')).totalHits).toBe(2);
  await chat.resetKey('client');
  expect((await chat.increment('client')).totalHits).toBe(1);
});

it('uses distributed counters only for the configured Lambda transport', () => {
  const original = env.REALTIME_MANAGEMENT_ENDPOINT;
  try {
    env.REALTIME_MANAGEMENT_ENDPOINT = undefined;
    expect(lambdaRateLimitStore('auth')).toBeUndefined();
    env.REALTIME_MANAGEMENT_ENDPOINT = 'https://gateway.example.test/prod';
    expect(lambdaRateLimitStore('auth')).toBeInstanceOf(LambdaRateLimitStore);
  } finally {
    env.REALTIME_MANAGEMENT_ENDPOINT = original;
  }
});
