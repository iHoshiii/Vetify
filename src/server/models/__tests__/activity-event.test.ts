import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { getDb } from '../../config/db';
import { state } from '../../config/db/state';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  ACTIVITY_EVENTS_COLLECTION,
  ACTIVITY_RETENTION_DAYS,
  activityEventsCollection,
  flushActivity,
  recordActivity,
} from '../activity-event';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  await flushActivity();
  await clearTestDb();
  vi.restoreAllMocks();
});
afterAll(stopTestDb);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The one event that was logged, after the fire-and-forget write has landed. */
async function loggedEvent() {
  await flushActivity();
  return activityEventsCollection().findOne({});
}

/**
 * Makes every insert bounce, the way a full disk or a schema-validated collection
 * would. The catch path is the whole contract here, so it needs a real failure
 * rather than a stubbed one.
 */
async function rejectWrites(reject: boolean): Promise<void> {
  await getDb().command({
    collMod: ACTIVITY_EVENTS_COLLECTION,
    validator: reject ? { type: { $eq: '__nothing_matches_this__' } } : {},
    validationLevel: reject ? 'strict' : 'off',
  });
}

describe('recordActivity', () => {
  it('logs the type, subject and metadata it was handed', async () => {
    const user = new ObjectId();

    recordActivity({
      type: 'user.logged_in',
      user,
      metadata: { provider: 'google' },
    });

    const event = await loggedEvent();
    expect(event).toMatchObject({
      type: 'user.logged_in',
      user,
      anonId: null,
      metadata: { provider: 'google' },
    });
  });

  it('returns before the write lands so a request never waits on telemetry', () => {
    // Not a promise: there is deliberately nothing for a caller to await, which
    // is why `flushActivity` exists for the tests and the shutdown hook.
    expect(recordActivity({ type: 'user.signed_up' })).toBeUndefined();
  });

  it('defaults the subject and metadata rather than leaving them absent', async () => {
    recordActivity({ type: 'user.logged_out' });

    const event = await loggedEvent();
    expect(event).toMatchObject({ user: null, anonId: null, metadata: {} });
  });

  it('keeps an anonymous visitor attributable by their quota cookie', async () => {
    recordActivity({ type: 'chat.message_sent', anonId: 'anon-123', metadata: { model: 'flash' } });

    const event = await loggedEvent();
    expect(event).toMatchObject({ user: null, anonId: 'anon-123' });
  });

  it('logs a malformed subject as anonymous instead of throwing', async () => {
    // A tampered JWT should cost a point of attribution, not the write.
    expect(() => recordActivity({ type: 'user.logged_in', user: 'not-an-object-id' })).not.toThrow();

    const event = await loggedEvent();
    expect(event!.user).toBeNull();
  });

  it('stamps the retention window on every event', async () => {
    const before = Date.now();
    recordActivity({ type: 'user.signed_up' });

    const event = await loggedEvent();
    const window = event!.expiresAt.getTime() - event!.createdAt.getTime();

    expect(window).toBe(ACTIVITY_RETENTION_DAYS * MS_PER_DAY);
    expect(event!.createdAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('does nothing and says nothing when the database is unreachable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // What an outage looks like to the rest of the process: the heartbeat listener
    // clears this flag long before a query would time out.
    state.serverResponding = false;

    try {
      expect(() => recordActivity({ type: 'user.logged_in' })).not.toThrow();
      await flushActivity();
    } finally {
      state.serverResponding = true;
    }

    // Fails open and silently: 30 seconds of server selection per sign-in is the
    // outcome this check exists to avoid, and a warning per request would bury
    // the log.
    expect(await activityEventsCollection().countDocuments()).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('swallows a failed write with one line in the log', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await rejectWrites(true);

    try {
      recordActivity({ type: 'user.logged_in' });
      // The contract callers rely on: nothing surfaces, here or as an unhandled
      // rejection later.
      await expect(flushActivity()).resolves.toBeUndefined();
    } finally {
      await rejectWrites(false);
    }

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('user.logged_in');
  });

  it('flushActivity waits for every write already started', async () => {
    for (const anonId of ['a', 'b', 'c']) {
      recordActivity({ type: 'chat.message_sent', anonId });
    }

    await flushActivity();

    expect(await activityEventsCollection().countDocuments()).toBe(3);
  });
});

describe('activity event indexes', () => {
  it('expires events through a TTL index rather than a cleanup job', async () => {
    const indexes = await activityEventsCollection().indexes();
    const ttl = indexes.find((index) => index.expireAfterSeconds !== undefined);

    // Zero, not the retention period: `expiresAt` already carries the date, so the
    // sweeper only has to notice it has passed.
    expect(ttl?.key).toEqual({ expiresAt: 1 });
    expect(ttl?.expireAfterSeconds).toBe(0);
  });

  it('indexes the axis every chart reads', async () => {
    const keys = (await activityEventsCollection().indexes()).map((index) => index.key);
    expect(keys).toEqual(expect.arrayContaining([{ type: 1, createdAt: -1 }]));
  });
});
