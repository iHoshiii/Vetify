import { ObjectId, type Collection } from 'mongodb';

import { getDb, isDbConnected } from '../../config/db';
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
