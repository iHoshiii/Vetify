import {
  getMetricsBreakdown,
  getMetricsOverview,
  getMetricsProviderTimeseries,
  type MetricsBreakdown,
  type MetricsOverview,
  type MetricsProviderTimeseries,
} from '@/services/admin.service';
import type { BreakdownDimension, UserRole } from '@shared/schemas';
import { useQuery } from '@tanstack/react-query';

import { METRICS_STALE_TIME, adminKeys, retryUnlessRefused } from './admin-keys';

/** The stat cards: totals now, and each series against the span before it. */
export function useMetricsOverview(days?: number) {
  return useQuery<MetricsOverview>({
    queryKey: adminKeys.overview(days),
    queryFn: ({ signal }) => getMetricsOverview(days, signal),
    staleTime: METRICS_STALE_TIME,
    retry: retryUnlessRefused,
  });
}

export function useMetricsProviderTimeseries(
  metric: 'signups' | 'logins' | 'applications' | 'users',
  days?: number
) {
  return useQuery<MetricsProviderTimeseries>({
    queryKey: [...adminKeys.timeseries(metric, days), 'providers'],
    queryFn: ({ signal }) => getMetricsProviderTimeseries({ metric, days }, signal),
    staleTime: METRICS_STALE_TIME,
    retry: retryUnlessRefused,
  });
}

/**
 * One breakdown chart. No window: this is the shape of what exists.
 *
 * `role` narrows the account dimensions to a single role, which is what the user
 * management tabs need — a status split of every account is a different number
 * from a status split of the role in the table underneath it.
 */
export function useMetricsBreakdown(dimension: BreakdownDimension, role?: UserRole) {
  return useQuery<MetricsBreakdown>({
    queryKey: adminKeys.breakdown(dimension, role),
    queryFn: ({ signal }) => getMetricsBreakdown(dimension, role, signal),
    staleTime: METRICS_STALE_TIME,
    retry: retryUnlessRefused,
  });
}
