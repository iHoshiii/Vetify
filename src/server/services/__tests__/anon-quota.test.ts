import { ANON_QUOTA_WINDOW_HOURS, FREE_ANON_QUERIES } from '@shared/limits';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AnonUsage } from '../../models/AnonUsage';
import { consumeAnonQuery, peekAnonUsage } from '../anon-quota';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('consumeAnonQuery', () => {
  it('allows exactly the free allowance and refuses the next one', async () => {
    for (let i = 1; i <= FREE_ANON_QUERIES; i++) {
      const verdict = await consumeAnonQuery('visitor-a');
      expect(verdict.allowed).toBe(true);
      expect(verdict.used).toBe(i);
      expect(verdict.remaining).toBe(FREE_ANON_QUERIES - i);
    }

    const overLimit = await consumeAnonQuery('visitor-a');
    expect(overLimit.allowed).toBe(false);
    expect(overLimit.remaining).toBe(0);
  });

  it('keeps counting past the cap so repeated attempts stay refused', async () => {
    for (let i = 0; i < FREE_ANON_QUERIES + 3; i++) await consumeAnonQuery('visitor-b');

    const verdict = await consumeAnonQuery('visitor-b');
    expect(verdict.allowed).toBe(false);
    expect(verdict.used).toBeGreaterThan(FREE_ANON_QUERIES);
  });

  it('counts each visitor separately', async () => {
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await consumeAnonQuery('visitor-c');

    const fresh = await consumeAnonQuery('visitor-d');
    expect(fresh.allowed).toBe(true);
    expect(fresh.used).toBe(1);
  });

  it('pins the window to the first question, not the last', async () => {
    await consumeAnonQuery('visitor-e');
    const first = (await AnonUsage.findOne({ anonId: 'visitor-e' }))!;
    const firstExpiry = first.expiresAt.getTime();

    await consumeAnonQuery('visitor-e');
    const second = (await AnonUsage.findOne({ anonId: 'visitor-e' }))!;

    expect(await AnonUsage.countDocuments({ anonId: 'visitor-e' })).toBe(1);
    expect(second.chatCount).toBe(2);
    // Unchanged on purpose: a rolling expiry would never lapse for someone who
    // kept retrying after being refused, so the allowance would never reset.
    expect(second.expiresAt.getTime()).toBe(firstExpiry);
  });

  it('closes the window roughly a day out', async () => {
    await consumeAnonQuery('visitor-h');
    const doc = (await AnonUsage.findOne({ anonId: 'visitor-h' }))!;

    const hoursOut = (doc.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
    expect(hoursOut).toBeGreaterThan(ANON_QUOTA_WINDOW_HOURS - 1);
    expect(hoursOut).toBeLessThanOrEqual(ANON_QUOTA_WINDOW_HOURS);
  });

  it('hands out a fresh allowance once the window has lapsed', async () => {
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await consumeAnonQuery('visitor-i');
    expect((await consumeAnonQuery('visitor-i')).allowed).toBe(false);

    // Stand in for Mongo's TTL sweep, which deletes the record on expiry. The
    // reset is that deletion — there is no counter to zero.
    await AnonUsage.deleteOne({ anonId: 'visitor-i' });

    const afterReset = await consumeAnonQuery('visitor-i');
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.used).toBe(1);
    expect(afterReset.remaining).toBe(FREE_ANON_QUERIES - 1);
  });

  it('survives concurrent requests without handing out extra questions', async () => {
    // Two tabs firing at once must not both read four and both be let through.
    const verdicts = await Promise.all(
      Array.from({ length: FREE_ANON_QUERIES + 4 }, () => consumeAnonQuery('visitor-f'))
    );

    expect(verdicts.filter((v) => v.allowed)).toHaveLength(FREE_ANON_QUERIES);
  });

  it('peek reports the count without spending one', async () => {
    await consumeAnonQuery('visitor-g');
    await consumeAnonQuery('visitor-g');

    expect(await peekAnonUsage('visitor-g')).toBe(2);
    expect(await peekAnonUsage('visitor-g')).toBe(2);
    expect(await peekAnonUsage('nobody')).toBe(0);
  });
});
