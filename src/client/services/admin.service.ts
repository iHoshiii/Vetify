import type {
  AdminUserSort,
  AuditAction,
  AuditTargetType,
  AuthProvider,
  BlogStatus,
  BreakdownDimension,
  MetricSeries,
  ProfessionalStatus,
  UserRole,
  UserStatus,
} from '@shared/schemas';

import { apiFetch } from './api';
import type { BlogSummary } from './blogs.service';
import type { OwnProfessional } from './professionals.service';

/**
 * Everything the dashboard reads and writes, in one typed layer over /admin.
 *
 * The response types are written out here rather than imported from the server:
 * the client build only sees src/client and src/shared, and a JSON contract is
 * not a TypeScript type either way. What keeps them honest is the enums — every
 * status, role and action below comes from @shared/schemas, which is the same list
 * the server validates against, so a new status cannot appear in a response the
 * client has no name for.
 *
 * Nothing here decides whether the caller may do any of it. These are HTTP calls
 * that will answer 403 to a non-admin; the gate is the server's re-read of the
 * stored role, and hiding the pages is only courtesy.
 */

/** A page of anything the admin lists. Same envelope for every collection. */
export type AdminPage<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

/** Page and limit, on every list. */
type Paged = { page?: number; limit?: number };

/**
 * Only the params that were actually set.
 *
 * Undefined is dropped rather than sent empty: `?status=` is a value the schema
 * would have to reject, whereas an absent param is what "no filter" means. `page=1`
 * is dropped too, so the first page of a list has a clean URL and one cache key.
 */
function queryOf(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    if (key === 'page' && value === 1) continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : '';
}

/* -------------------------------------------------------------------------- *
 * Accounts
 * -------------------------------------------------------------------------- */

/** One account as the dashboard sees it: the public fields plus the moderation trail. */
export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProvider;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: UserRole;
  status: UserStatus;
  statusReason: string | null;
  statusChangedBy: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserListParams = Paged & {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  provider?: AuthProvider;
  sort?: AdminUserSort;
};

/** What a role change answers with: the account after, and the move it made. */
export type RoleChangeResult = { user: AdminUser; roleFrom: UserRole; roleTo: UserRole };

/**
 * A status change, plus how many sessions it killed.
 *
 * `sessionsRevoked` is surfaced because it is the part an admin cannot see for
 * themselves: banning an account that is signed in on four devices is a different
 * event from banning one nobody is using, and the number is the difference.
 */
export type StatusChangeResult = {
  user: AdminUser;
  statusFrom: UserStatus;
  statusTo: UserStatus;
  sessionsRevoked: number;
};

export function listAdminUsers(
  params: AdminUserListParams = {},
  signal?: AbortSignal
): Promise<AdminPage<AdminUser>> {
  return apiFetch(`/admin/users${queryOf({ ...params })}`, { signal });
}

export function getAdminUser(id: string, signal?: AbortSignal): Promise<AdminUser> {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}`, { signal });
}

export function updateUserRole(input: {
  id: string;
  role: UserRole;
  reason?: string;
}): Promise<RoleChangeResult> {
  return apiFetch(`/admin/users/${encodeURIComponent(input.id)}/role`, {
    method: 'PATCH',
    body: { role: input.role, reason: input.reason },
  });
}

export function updateUserStatus(input: {
  id: string;
  status: UserStatus;
  reason?: string;
}): Promise<StatusChangeResult> {
  return apiFetch(`/admin/users/${encodeURIComponent(input.id)}/status`, {
    method: 'PATCH',
    body: { status: input.status, reason: input.reason },
  });
}

/* -------------------------------------------------------------------------- *
 * Posts
 * -------------------------------------------------------------------------- */

export type AdminBlogAuthor = { id: string; email: string; name: string | null };

/**
 * A post with its moderation trail and the account behind it.
 *
 * `author` is null when that account is gone — a real state rather than an error,
 * since the post outlives the account that wrote it.
 */
export type AdminBlogSummary = BlogSummary & {
  author: AdminBlogAuthor | null;
  removedBy: string | null;
  removedReason: string | null;
  removedAt: string | null;
};

/** The same with the body: nobody can judge a post they cannot read. */
export type AdminBlogDetail = AdminBlogSummary & { body: string };

export type AdminBlogListParams = Paged & {
  status?: BlogStatus;
  author?: string;
  tag?: string;
  q?: string;
};

export type BlogDecisionResult = {
  blog: AdminBlogDetail;
  statusFrom: BlogStatus;
  statusTo: BlogStatus;
};

export function listAdminBlogs(
  params: AdminBlogListParams = {},
  signal?: AbortSignal
): Promise<AdminPage<AdminBlogSummary>> {
  return apiFetch(`/admin/blogs${queryOf({ ...params })}`, { signal });
}

export function getAdminBlog(id: string, signal?: AbortSignal): Promise<AdminBlogDetail> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(id)}`, { signal });
}

/**
 * Hide, take down, or put back.
 *
 * One function for the three because they are one decision with three verdicts,
 * and the server treats them the same way — same audit entry, same guards. The
 * reason is optional in the type and required by the server for a takedown, which
 * is where that rule belongs: it is the string somebody will be asked to defend.
 */
export function moderateBlog(input: {
  id: string;
  decision: 'hide' | 'remove' | 'restore';
  reason?: string;
}): Promise<BlogDecisionResult> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(input.id)}/${input.decision}`, {
    method: 'PATCH',
    body: { reason: input.reason },
  });
}

/* -------------------------------------------------------------------------- *
 * Applications
 * -------------------------------------------------------------------------- */

export type AdminApplicant = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
};

/** An application as a reviewer sees it: the submission, the applicant, the verdict. */
export type AdminProfessional = OwnProfessional & {
  applicant: AdminApplicant | null;
  reviewedBy: string | null;
};

export type AdminProfessionalListParams = Paged & { status?: ProfessionalStatus; q?: string };

export type ProfessionalDecisionResult = {
  application: AdminProfessional;
  roleFrom: UserRole;
  roleTo: UserRole;
};

export function listAdminProfessionals(
  params: AdminProfessionalListParams = {},
  signal?: AbortSignal
): Promise<AdminPage<AdminProfessional>> {
  return apiFetch(`/admin/professionals${queryOf({ ...params })}`, { signal });
}

export function getAdminProfessional(id: string, signal?: AbortSignal): Promise<AdminProfessional> {
  return apiFetch(`/admin/professionals/${encodeURIComponent(id)}`, { signal });
}

/**
 * Approve an application, turn it down, or pull a listing that is already live.
 *
 * All three move the applicant's role as well as the application's status, which
 * is why the result carries both: the screen that showed "user" a moment ago has
 * to show "professional" now, and it should not have to refetch to find out.
 */
export function reviewProfessional(input: {
  id: string;
  decision: 'verify' | 'reject' | 'suspend';
  reason?: string;
}): Promise<ProfessionalDecisionResult> {
  return apiFetch(`/admin/professionals/${encodeURIComponent(input.id)}/${input.decision}`, {
    method: 'PATCH',
    body: { reason: input.reason },
  });
}

/* -------------------------------------------------------------------------- *
 * Audit trail
 * -------------------------------------------------------------------------- */

/**
 * One thing an admin did.
 *
 * `actorEmail` is the address as it read at the time, copied at write time rather
 * than joined, so an entry stays readable after the account is renamed or deleted.
 * `actor` is null for something the system did to itself — the seed script
 * granting the first admin, before there was an admin to attribute it to.
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

export type AuditListParams = Paged & {
  action?: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  actor?: string;
};

export function listAudit(
  params: AuditListParams = {},
  signal?: AbortSignal
): Promise<AdminPage<AuditEntry>> {
  return apiFetch(`/admin/audit${queryOf({ ...params })}`, { signal });
}

/* -------------------------------------------------------------------------- *
 * Metrics
 * -------------------------------------------------------------------------- */

/** A figure against the same span before it. `change` is null when there was no
 * baseline — coming from zero has no percentage. */
export type MetricTrend = { current: number; previous: number; change: number | null };

export type MetricsOverview = {
  days: number;
  generatedAt: string;
  totals: {
    users: number;
    admins: number;
    professionals: number;
    pendingApplications: number;
    blogs: number;
    publishedBlogs: number;
    moderatedBlogs: number;
  };
  trend: Record<MetricSeries, MetricTrend>;
};

export type MetricPoint = { date: string; count: number };

export type MetricsTimeseries = {
  metric: MetricSeries;
  days: number;
  from: string;
  to: string;
  /** Every day in the window, oldest first, empty days included as zeroes. */
  points: MetricPoint[];
};

export type MetricsBreakdown = {
  dimension: BreakdownDimension;
  total: number;
  /** Largest first, ties broken by label so the chart does not reshuffle. */
  slices: { label: string; count: number }[];
};

export function getMetricsOverview(days?: number, signal?: AbortSignal): Promise<MetricsOverview> {
  return apiFetch(`/admin/metrics/overview${queryOf({ days })}`, { signal });
}

export function getMetricsTimeseries(
  params: { metric: MetricSeries; days?: number },
  signal?: AbortSignal
): Promise<MetricsTimeseries> {
  return apiFetch(`/admin/metrics/timeseries${queryOf({ ...params })}`, { signal });
}

export function getMetricsBreakdown(
  dimension: BreakdownDimension,
  signal?: AbortSignal
): Promise<MetricsBreakdown> {
  return apiFetch(`/admin/metrics/breakdown${queryOf({ dimension })}`, { signal });
}
