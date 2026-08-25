import { ObjectId, type IndexDescription } from 'mongodb';

// database collection for the raw activity stream behind the dashboard charts
export const ACTIVITY_EVENTS_COLLECTION = 'activityevents';

/**
 * How long a raw event is kept.
 *
 * Long enough to cover the dashboard's widest window, short enough that the
 * collection cannot grow without bound. The counts that need to outlive this —
 * "users who ever signed up" — are read from the collections themselves rather
 * than from events, so nothing permanent depends on this number.
 */
export const ACTIVITY_RETENTION_DAYS = 90;

// what happened. A closed list on purpose: the charts group by this field, and a
// free-form string would let a typo quietly create a category of one.
export const ACTIVITY_TYPES = [
  'chat.message_sent',
  'professional.applied',
  'user.logged_in',
  'user.logged_out',
  'user.signed_up',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityEventDocument = {
  _id: ObjectId;
  type: ActivityType;
  // At most one of these is set: a signed-in caller has a user, an anonymous one
  // has the cookie id the chat quota already counts them by. Both are null for
  // an event that belongs to neither.
  user: ObjectId | null;
  anonId: string | null;
  // Small, per-event detail — the provider a login came through, the model a
  // chat used. Deliberately loose: this is a log, not a schema.
  metadata: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
};

export const ACTIVITY_EVENT_INDEXES: IndexDescription[] = [
  // Every chart filters by type and buckets by date, newest first.
  { key: { type: 1, createdAt: -1 } },
  // TTL sweep, same shape as the anonymous usage records.
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];
