import {
  getMetricsBreakdown,
  getMetricsOverview,
  getMetricsTimeseries,
  type MetricsBreakdown,
  type MetricsOverview,
  type MetricsTimeseries,
} from '@/services/admin.service';
import type { BreakdownDimension, MetricSeries } from '@shared/schemas';
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

/**
 * One chart line.
 *
 * `placeholderData` keeps the current line drawn while a longer window loads, so
 * switching from 7 days to 30 redraws rather than blanking — the axis moves, which
 * is enough to show something happened.
 */
export function useMetricsTimeseries(metric: MetricSeries, days?: number) {
  return useQuery<MetricsTimeseries>({
    queryKey: adminKeys.timeseries(metric, days),
    queryFn: ({ signal }) => getMetricsTimeseries({ metric, days }, signal),
    staleTime: METRICS_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

/** One breakdown chart. No window: this is the shape of what exists. */
export function useMetricsBreakdown(dimension: BreakdownDimension) {
  return useQuery<MetricsBreakdown>({
    queryKey: adminKeys.breakdown(dimension),
    queryFn: ({ signal }) => getMetricsBreakdown(dimension, signal),
    staleTime: METRICS_STALE_TIME,
    retry: retryUnlessRefused,
  });
}
