import {
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  type AuditAction,
  type AuditTargetType,
} from '@shared/schemas';
import { ObjectId, type IndexDescription } from 'mongodb';

// database collection for the record of who did what to whom
export const AUDIT_LOGS_COLLECTION = 'auditlogs';

// The action and target vocabularies live in @shared/schemas: the audit screen
// filters on exactly these values, so the list the server can write and the list
// the UI can offer have to be one list. Re-exported for the existing importers.
export { AUDIT_ACTIONS, AUDIT_TARGET_TYPES };
export type { AuditAction, AuditTargetType };

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
 * One entry as the audit screen reads it.
 *
 * Nothing is joined to produce this: the actor's email and the target's
 * identifying detail were copied into the row when it was written, precisely so
 * an entry about a deleted account still says whose account it was.
 */
export type AuditEntry = {
  id: string;
  actor: string | null;
  actorEmail: string | null;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
};

export type AuditPage = {
  items: AuditEntry[];
  page: number;
  limit: number;
  total: number;
  pages: number;
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
