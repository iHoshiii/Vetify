import { ADMIN_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection, type Filter, type Sort } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { dailyCountStages, type DailyCount } from '../daily-count';
import {
  AUDIT_LOGS_COLLECTION,
  type AuditAction,
  type AuditLogDocument,
  type AuditTargetType,
} from './types';

export function auditLogsCollection(): Collection<AuditLogDocument> {
  return getDb().collection<AuditLogDocument>(AUDIT_LOGS_COLLECTION);
}

export function countAuditPerDay(action: AuditAction, from: Date): Promise<DailyCount[]> {
  return auditLogsCollection()
    .aggregate<DailyCount>([
      { $match: { action, createdAt: { $gte: from } } },
      ...dailyCountStages('createdAt'),
    ])
    .toArray();
}

export type RecordAuditInput = {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string | ObjectId;
  /** Omitted only for something the system did on its own behalf, like the seed
   * script granting the first admin. */
  actor?: string | ObjectId | null;
  actorEmail?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Records one privileged action.
 *
 * The opposite of `recordActivity` in every way that matters: awaited, and
 * allowed to fail loudly. Activity events are telemetry, so losing one costs a
 * point on a chart. An audit entry is the reason the action was allowed to be
 * this powerful, and an admin who deletes an account with no record of it is the
 * situation the log exists to prevent.
 *
 * Callers await this after the mutation lands, which leaves one window: a write
 * that succeeds while the audit entry fails reports an error for a change that
 * did happen. That is the right way round — a visible inconsistency the admin can
 * check beats a silent unaudited change.
 */
export async function recordAudit(input: RecordAuditInput): Promise<AuditLogDocument> {
  const doc: AuditLogDocument = {
    _id: new ObjectId(),
    actor: input.actor ? toObjectId(input.actor) : null,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: toObjectId(input.targetId),
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
    ip: input.ip ?? null,
    createdAt: new Date(),
  };

  await auditLogsCollection().insertOne(doc);
  return doc;
}

/** Newest first, which is the only order an audit trail is read in. */
const AUDIT_SORT: Sort = { createdAt: -1 };

export type FindAuditOptions = {
  action?: AuditAction;
  targetType?: AuditTargetType;
  /** Everything ever done to one post, account or application. */
  targetId?: string | ObjectId;
  /** Everything one admin has done. */
  actor?: string | ObjectId;
  page?: number;
  limit?: number;
};

/**
 * One page of the trail, filtered the four ways the screen offers.
 *
 * Each filter matches an index rather than a scan: `actor` uses
 * `{ actor: 1, createdAt: -1 }`, `targetType` with `targetId` uses the target
 * index, and the unfiltered default view uses `{ createdAt: -1 }`. The sort is
 * that leading field alone, so it stays a walk of the index instead of a sort in
 * memory — two entries written in the same millisecond can swap places between
 * pages, which is a fair trade for never loading the collection to order it.
 *
 * No projection: unlike the users collection there is nothing here to hide from an
 * admin, since the row is the record they came to read.
 */
export async function findAuditEntries(
  options: FindAuditOptions = {}
): Promise<{ items: AuditLogDocument[]; total: number }> {
  const { action, targetType, targetId, actor, page = 1, limit = ADMIN_PAGE_SIZE } = options;

  const filter: Filter<AuditLogDocument> = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (targetId) filter.targetId = toObjectId(targetId);
  if (actor) filter.actor = toObjectId(actor);

  const [items, total] = await Promise.all([
    auditLogsCollection()
      .find(filter)
      .sort(AUDIT_SORT)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    auditLogsCollection().countDocuments(filter),
  ]);

  return { items, total };
}
