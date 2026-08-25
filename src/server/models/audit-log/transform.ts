import type { AuditEntry, AuditLogDocument, AuditPage } from './types';

/**
 * One row for the audit screen.
 *
 * A straight mapping of ids and dates to strings, with nothing removed: an audit
 * entry is written to be read by an admin, and the fields that would be sensitive
 * anywhere else - the actor, the address they acted from - are the point of it.
 */
export function toAuditEntry(entry: AuditLogDocument): AuditEntry {
  return {
    id: entry._id.toString(),
    actor: entry.actor?.toString() ?? null,
    actorEmail: entry.actorEmail ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId.toString(),
    reason: entry.reason ?? null,
    metadata: entry.metadata ?? {},
    ip: entry.ip ?? null,
    createdAt: entry.createdAt.toISOString(),
  };
}

/** A page of the trail, paged by the same arithmetic as every other admin list. */
export function toAuditPage(input: {
  items: AuditLogDocument[];
  total: number;
  page: number;
  limit: number;
}): AuditPage {
  return {
    items: input.items.map(toAuditEntry),
    page: input.page,
    limit: input.limit,
    total: input.total,
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
