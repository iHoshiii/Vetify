import { ANON_QUOTA_WINDOW_HOURS, FREE_ANON_QUERIES } from '@shared/limits';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { anonUsagesCollection } from '../../models/AnonUsage';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { consumeAnonQuery, peekAnonUsage } from '../anon-quota';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

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
    const first = (await anonUsagesCollection().findOne({ anonId: 'visitor-e' }))!;
    const firstExpiry = first.expiresAt.getTime();

    await consumeAnonQuery('visitor-e');
    const second = (await anonUsagesCollection().findOne({ anonId: 'visitor-e' }))!;

    expect(await anonUsagesCollection().countDocuments({ anonId: 'visitor-e' })).toBe(1);
    expect(second.chatCount).toBe(2);
    // Unchanged on purpose: a rolling expiry would never lapse for someone who
    // kept retrying after being refused, so the allowance would never reset.
    expect(second.expiresAt.getTime()).toBe(firstExpiry);
  });

  it('closes the window roughly a day out', async () => {
    await consumeAnonQuery('visitor-h');
    const doc = (await anonUsagesCollection().findOne({ anonId: 'visitor-h' }))!;

    const hoursOut = (doc.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
    expect(hoursOut).toBeGreaterThan(ANON_QUOTA_WINDOW_HOURS - 1);
    expect(hoursOut).toBeLessThanOrEqual(ANON_QUOTA_WINDOW_HOURS);
  });

  it('hands out a fresh allowance once the window has lapsed', async () => {
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await consumeAnonQuery('visitor-i');
    expect((await consumeAnonQuery('visitor-i')).allowed).toBe(false);

    // Stand in for Mongo's TTL sweep, which deletes the record on expiry. One of
    // the two ways the allowance comes back; the other is below.
    await anonUsagesCollection().deleteOne({ anonId: 'visitor-i' });

    const afterReset = await consumeAnonQuery('visitor-i');
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.used).toBe(1);
    expect(afterReset.remaining).toBe(FREE_ANON_QUERIES - 1);
  });

  it('resets a record whose window closed before the sweep reached it', async () => {
    for (let i = 0; i < FREE_ANON_QUERIES; i++) await consumeAnonQuery('visitor-j');
    expect((await consumeAnonQuery('visitor-j')).allowed).toBe(false);

    // The state the reset used to miss. The TTL monitor runs about once a minute
    // and only on the primary, so an expired record is routinely still sitting
    // here — and the count used to keep climbing against it, which is what made
    // the limit look permanent.
    await anonUsagesCollection().updateOne(
      { anonId: 'visitor-j' },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    const afterLapse = await consumeAnonQuery('visitor-j');
    expect(afterLapse.allowed).toBe(true);
    expect(afterLapse.used).toBe(1);
    expect(afterLapse.remaining).toBe(FREE_ANON_QUERIES - 1);

    const doc = (await anonUsagesCollection().findOne({ anonId: 'visitor-j' }))!;
    expect(doc.chatCount).toBe(1);
    // A new window, not the old one carried forward.
    expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now());
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

  it('peek reports nothing for a window that has closed', async () => {
    await consumeAnonQuery('visitor-k');
    await anonUsagesCollection().updateOne(
      { anonId: 'visitor-k' },
      { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );

    // The count has already been forgiven, so quoting it would show a limit the
    // next question would not hit.
    expect(await peekAnonUsage('visitor-k')).toBe(0);
  });
});
