import { ObjectId, type IndexDescription } from 'mongodb';

// database collection for the record of who did what to whom
export const AUDIT_LOGS_COLLECTION = 'auditlogs';

/**
 * Every privileged action, named. A closed list because this is the vocabulary
 * the audit screen filters on and the thing a reviewer scans for — a free-form
 * string would let one caller write 'blog.remove' and another 'blog.removed',
 * and neither would show up under the other's filter.
 */
export const AUDIT_ACTIONS = [
  'professional.rejected',
  'professional.suspended',
  'professional.verified',
  'user.role.changed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** What the action was performed on, so a target can be found without its type
 * being guessed from the id. */
export const AUDIT_TARGET_TYPES = ['professional', 'user'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

export type AuditLogDocument = {
  _id: ObjectId;
  // Null for something the system did to itself — the seed script granting the
  // first admin, before any admin exists to attribute it to.
  actor: ObjectId | null;
  /**
   * The actor's email as it read at the time, copied rather than joined.
   *
   * An audit entry has to stay readable after the account behind it is renamed
   * or deleted; a $lookup would render "unknown" for exactly the accounts most
   * worth looking up.
   */
  actorEmail: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: ObjectId;
  /** Why. Required by the routes for anything destructive, so a takedown cannot
   * be recorded without a stated cause. */
  reason: string | null;
  /** Before-and-after detail, so an entry explains the change on its own without
   * the reader reconstructing it from neighbouring rows. */
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: Date;
};

/**
 * No TTL here, unlike the activity events. Accountability records are the one
 * thing that must outlive a retention window: the value of "who removed this
 * account" is highest long after everyone has forgotten.
 */
export const AUDIT_LOG_INDEXES: IndexDescription[] = [
  // The audit screen's default view: everything, newest first.
  { key: { createdAt: -1 } },
  // Everything one admin has done.
  { key: { actor: 1, createdAt: -1 } },
  // Everything ever done to one target.
  { key: { targetType: 1, targetId: 1, createdAt: -1 } },
];
