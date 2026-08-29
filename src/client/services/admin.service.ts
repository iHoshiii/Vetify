import type {
  AdminUserSort,
  AuditAction,
  AuditTargetType,
  AuthProvider,
  BlogStatus,
  BreakdownDimension,
  MetricSeries,
  ModerationCategory,
  ModerationOutcome,
  ProfessionalInquiryStatus,
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
 * What the automatic screen made of a post, and whether a human has answered it.
 *
 * `severity` is what orders the queue, so the server sorts on it and this is only
 * for showing the number. `reviewedAt` is null until somebody has decided either
 * way — approving and taking down both count as deciding.
 */
export type AdminBlogModeration = {
  outcome: ModerationOutcome;
  categories: ModerationCategory[];
  severity: number;
  terms: string[];
  notes: string | null;
  model: string | null;
  checkedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

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
  /** Null on a post the screen never saw, which is not the same as a clean pass. */
  moderation: AdminBlogModeration | null;
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
 * Approve, hide, take down, or put back.
 *
 * One function for the four because they are one decision with four verdicts, and
 * the server treats them the same way — same audit entry, same guards. The reason
 * is optional in the type and required by the server for a takedown, which is
 * where that rule belongs: it is the string somebody will be asked to defend.
 */
export function moderateBlog(input: {
  id: string;
  decision: 'approve' | 'hide' | 'remove' | 'restore';
  reason?: string;
}): Promise<BlogDecisionResult> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(input.id)}/${input.decision}`, {
    method: 'PATCH',
    body: { reason: input.reason },
  });
}

/** Enough to name the post that is no longer there. */
export type PurgeBlogResult = { id: string; title: string; slug: string; authorId: string };

/**
 * Deletes a post for good.
 *
 * Separate from moderateBlog because it is not one of the verdicts: it destroys the
 * row rather than moving its status, and the server refuses it on anything that has
 * not already been taken down. The reason is required by both.
 */
export function purgeBlog(input: { id: string; reason: string }): Promise<PurgeBlogResult> {
  return apiFetch(`/admin/blogs/${encodeURIComponent(input.id)}`, {
    method: 'DELETE',
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
  /**
   * Whether the applicant was written to, or null when the verdict owed them
   * nothing — which is a suspension, an internal lever on a listing rather than a
   * word to the vet. Not folded into a boolean: "no email was owed" and "the email
   * did not go out" are different things to put on the screen.
   */
  mail: MailOutcome | null;
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

/**
 * Books the conversation an applicant is waiting on.
 *
 * Not one of the three verdicts, and not shaped like one: no role moves, so the
 * result carries the delivery outcome instead. The booking stands whether or not
 * the email went out, and the screen is told which so it can offer to say it
 * another way.
 */
export function scheduleInterview(input: {
  id: string;
  interviewAt: string;
  note?: string;
}): Promise<{ application: AdminProfessional } & MailOutcome> {
  return apiFetch(`/admin/professionals/${encodeURIComponent(input.id)}/interview`, {
    method: 'PATCH',
    body: { interviewAt: input.interviewAt, note: input.note },
  });
}

/* -------------------------------------------------------------------------- *
 * Enquiries, which come before applications
 * -------------------------------------------------------------------------- */

/**
 * Whether the message that went with a decision actually left.
 *
 * Reported rather than thrown, because the decision is already recorded by the
 * time the mailer is asked: a provider that is down does not unwind an invitation,
 * it just means somebody has to pass the link on by hand.
 */
export type MailOutcome = { delivered: boolean; deliveryError: string | null };

/** An enquiry as a reviewer sees it: what was said, and what was done about it. */
export type AdminInquiry = {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  currentLocation: string;
  clinicLocation: string | null;
  motivation: string;
  phone: string | null;
  yearsExperience: number | null;
  status: ProfessionalInquiryStatus;
  inviteNote: string | null;
  invitedAt: string | null;
  inviteExpiresAt: string | null;
  /** Whether the emailed link would still work if somebody clicked it now. */
  inviteLive: boolean;
  inviteCount: number;
  declineReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  applicationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminInquiryListParams = Paged & { status?: ProfessionalInquiryStatus; q?: string };

export function listAdminInquiries(
  params: AdminInquiryListParams = {},
  signal?: AbortSignal
): Promise<AdminPage<AdminInquiry>> {
  return apiFetch(`/admin/inquiries${queryOf({ ...params })}`, { signal });
}

export function getAdminInquiry(id: string, signal?: AbortSignal): Promise<AdminInquiry> {
  return apiFetch(`/admin/inquiries/${encodeURIComponent(id)}`, { signal });
}

/**
 * Invite an enquiry through to the real application.
 *
 * The raw link comes back because this response is the only place besides the
 * inbox that it exists — it is stored as a hash and cannot be read again. Calling
 * this twice resends: a new link, the old one dead.
 */
export function inviteInquiry(input: {
  id: string;
  note?: string;
}): Promise<{ inquiry: AdminInquiry; link: string } & MailOutcome> {
  return apiFetch(`/admin/inquiries/${encodeURIComponent(input.id)}/invite`, {
    method: 'PATCH',
    body: { note: input.note },
  });
}

/**
 * Turn an enquiry away, with a reason.
 *
 * The reason is for the queue and the audit log; the applicant's email says only
 * that the enquiry was not taken further.
 */
export function declineInquiry(input: {
  id: string;
  reason: string;
}): Promise<{ inquiry: AdminInquiry } & MailOutcome> {
  return apiFetch(`/admin/inquiries/${encodeURIComponent(input.id)}/decline`, {
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
    /** Held by the screen, waiting on a human. The one blog figure that is a queue. */
    flaggedBlogs: number;
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
  /** The role it was narrowed to, echoed back, or null for every account. */
  role: UserRole | null;
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

/**
 * One breakdown, optionally narrowed to a role.
 *
 * The server refuses a role on the post and application dimensions rather than
 * dropping it, so passing one there is a 400 and not a chart of the wrong thing.
 */
export function getMetricsBreakdown(
  dimension: BreakdownDimension,
  role?: UserRole,
  signal?: AbortSignal
): Promise<MetricsBreakdown> {
  return apiFetch(`/admin/metrics/breakdown${queryOf({ dimension, role })}`, { signal });
}
