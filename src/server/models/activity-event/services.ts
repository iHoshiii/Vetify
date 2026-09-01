import { ObjectId, type Collection } from 'mongodb';

import { getDb, isDbConnected } from '../../config/db';
import { dailyCountStages, type DailyCount } from '../daily-count';
import { isValidObjectId, toObjectId } from '../object-id';
import {
  ACTIVITY_EVENTS_COLLECTION,
  ACTIVITY_RETENTION_DAYS,
  type ActivityEventDocument,
  type ActivityType,
} from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function activityEventsCollection(): Collection<ActivityEventDocument> {
  return getDb().collection<ActivityEventDocument>(ACTIVITY_EVENTS_COLLECTION);
}

export type RecordActivityInput = {
  type: ActivityType;
  user?: string | ObjectId | null;
  anonId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Writes still on their way to Mongo.
 *
 * `recordActivity` returns before its insert lands, which is the point — but it
 * leaves tests with nothing to await and a shutdown with nothing to wait on.
 * Holding the promises here gives both something to hook into without making
 * callers deal with them.
 */
const inFlight = new Set<Promise<unknown>>();

/**
 * Logs one thing that happened, and never gets in the way of the request that
 * caused it.
 *
 * Deliberately not awaited by callers and deliberately unable to throw. This is
 * telemetry: a login must not fail because the log write did, and it must not
 * wait on Mongo either — an unreachable database would otherwise add the driver's
 * full server-selection timeout to every sign-in. The connection check up front
 * is the same fail-open the anonymous quota uses.
 */
export function recordActivity(input: RecordActivityInput): void {
  if (!isDbConnected()) return;

  const now = new Date();

  const doc: ActivityEventDocument = {
    _id: new ObjectId(),
    type: input.type,
    // A subject that is not a valid id is logged as anonymous rather than
    // throwing, so a malformed JWT cannot take the write down with it.
    user: input.user && isValidObjectId(input.user) ? toObjectId(input.user) : null,
    anonId: input.anonId ?? null,
    metadata: input.metadata ?? {},
    createdAt: now,
    expiresAt: new Date(now.getTime() + ACTIVITY_RETENTION_DAYS * MS_PER_DAY),
  };

  const write = activityEventsCollection()
    .insertOne(doc)
    .catch((err: unknown) => {
      // One line, not a stack: a failed telemetry write is worth noticing and
      // not worth alarming anyone.
      console.warn(`[activity] could not record ${input.type}: ${(err as Error).message}`);
    })
    .finally(() => inFlight.delete(write));

  inFlight.add(write);
}

/**
 * Waits for the writes already started. Tests use it to assert on what was
 * logged; a shutdown hook could use it to avoid losing the last few events.
 */
export async function flushActivity(): Promise<void> {
  while (inFlight.size > 0) {
    // Settling one write can start no others, but awaiting a snapshot is still
    // clearer than trusting the set not to change under us.
    await Promise.allSettled([...inFlight]);
  }
}
/**
 * How many events of one type fell in a half-open window, [from, to).
 *
 * Half-open so two adjacent windows can be compared without the boundary event
 * being counted in both — which is exactly the arithmetic the overview's "up 12%
 * on the previous week" depends on.
 */
export function countActivityBetween(input: {
  type: ActivityType;
  from: Date;
  to: Date;
}): Promise<number> {
  return activityEventsCollection().countDocuments({
    type: input.type,
    createdAt: { $gte: input.from, $lt: input.to },
  });
}

/**
 * One row per day for one type, oldest first, since `from`.
 *
 * Uses the `{ type: 1, createdAt: -1 }` index for the match. Anything older than
 * the retention window is simply not there — which is why the chart's own bounds
 * are derived from that window rather than chosen independently.
 */
export function countActivityPerDay(input: {
  type: ActivityType;
  from: Date;
}): Promise<DailyCount[]> {
  return activityEventsCollection()
    .aggregate<DailyCount>([
      { $match: { type: input.type, createdAt: { $gte: input.from } } },
      ...dailyCountStages('createdAt'),
    ])
    .toArray();
}

/** Daily counts grouped by the authentication provider stored on the event. */
export function countActivityPerDayByProvider(input: {
  type: ActivityType;
  from: Date;
}): Promise<{ date: string; provider: string; count: number }[]> {
  return activityEventsCollection()
    .aggregate<{ date: string; provider: string; count: number }>([
      { $match: { type: input.type, createdAt: { $gte: input.from } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            provider: { $ifNull: ['$metadata.provider', 'local'] },
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: '$_id.date', provider: '$_id.provider', count: 1 } },
      { $sort: { date: 1, provider: 1 } },
    ])
    .toArray();
}
