import { ApiError } from '@/services/api';
import type {
  AdminBlogListParams,
  AdminProfessionalListParams,
  AdminUserListParams,
  AuditListParams,
} from '@/services/admin.service';
import type { BreakdownDimension, MetricSeries } from '@shared/schemas';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Cache keys for the whole dashboard, in one tree.
 *
 * Shared rather than one factory per hook file because admin mutations cross
 * families: approving an application moves the applicant's role, so it changes the
 * account list; it writes an audit row; and it moves a number on the overview.
 * A hook that invalidated only its own family would leave two screens stale, and
 * the caller cannot hand-write those arrays without matching this one exactly.
 */
export const adminKeys = {
  all: ['admin'] as const,

  users: () => [...adminKeys.all, 'users'] as const,
  userList: (params: AdminUserListParams) => [...adminKeys.users(), 'list', params] as const,
  user: (id: string) => [...adminKeys.users(), 'detail', id] as const,

  blogs: () => [...adminKeys.all, 'blogs'] as const,
  blogList: (params: AdminBlogListParams) => [...adminKeys.blogs(), 'list', params] as const,
  blog: (id: string) => [...adminKeys.blogs(), 'detail', id] as const,

  professionals: () => [...adminKeys.all, 'professionals'] as const,
  professionalList: (params: AdminProfessionalListParams) =>
    [...adminKeys.professionals(), 'list', params] as const,
  professional: (id: string) => [...adminKeys.professionals(), 'detail', id] as const,

  audit: () => [...adminKeys.all, 'audit'] as const,
  auditList: (params: AuditListParams) => [...adminKeys.audit(), 'list', params] as const,

  metrics: () => [...adminKeys.all, 'metrics'] as const,
  overview: (days: number | undefined) => [...adminKeys.metrics(), 'overview', days] as const,
  timeseries: (metric: MetricSeries, days: number | undefined) =>
    [...adminKeys.metrics(), 'timeseries', metric, days] as const,
  breakdown: (dimension: BreakdownDimension) =>
    [...adminKeys.metrics(), 'breakdown', dimension] as const,
};

/**
 * How stale a list may be before it is refetched.
 *
 * Short, unlike the public feed's minute: this is the screen somebody is acting
 * from, and a role badge that is thirty seconds out of date is a wrong answer to
 * "did that work".
 */
export const ADMIN_STALE_TIME = 15_000;

/**
 * The metrics stale window matches the server's own cache.
 *
 * Asking again sooner than that cannot return a different number, so it would be a
 * round trip spent to be told the same thing.
 */
export const METRICS_STALE_TIME = 60_000;

/**
 * A 4xx is an answer. A 403 here means the role check refused, and asking three
 * more times will be refused three more times.
 */
export function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/**
 * What every admin mutation invalidates: its own family, the audit trail, and the
 * charts.
 *
 * Every one of them writes an audit row and moves a count, so those two are not a
 * guess — they are part of what the mutation did. The charts may still answer with
 * the same numbers for up to a minute, which is the server's cache and deliberate.
 */
export function invalidateAdmin(queryClient: QueryClient, family: readonly unknown[]): void {
  void queryClient.invalidateQueries({ queryKey: family });
  void queryClient.invalidateQueries({ queryKey: adminKeys.audit() });
  void queryClient.invalidateQueries({ queryKey: adminKeys.metrics() });
}
