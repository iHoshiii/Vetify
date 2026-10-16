import { useMetricsBreakdown, useMetricsProviderTimeseries } from '@/hooks/useAdminMetrics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { USER_STATUSES } from '@shared/schemas';
import { useState } from 'react';

import { ProviderMetricChart } from '../_components/provider-metric-chart';
import { StatCard, StatCardSkeleton } from '../_components/stat-card';
import { CHIP, CHIP_OFF, CHIP_ON, FRAME, PANEL_HEADING } from '../_components/ui';

/**
 * A week, a month, a quarter.
 *
 * 90 is the ceiling because that is how long raw activity events are kept — a longer
 * window would draw a line that is honest for 90 days and flat zero behind it.
 */
const WINDOWS = [7, 30, 90] as const;
const PLATFORM_METRICS = ['signups', 'logins', 'users', 'applications'] as const;
type PlatformMetric = (typeof PLATFORM_METRICS)[number];
const PLATFORM_LABELS: Record<PlatformMetric, string> = {
  signups: 'Signups',
  logins: 'Sign-ins',
  users: 'Users',
  applications: 'Applications',
};
const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  professionals: 'Professionals',
  public: 'Public users',
  total: 'Total',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

// Main account activity and professional application statistics.
export default function StatisticsTab() {
  useDocumentTitle('Admin application statistics', 'How the licence pipeline is moving.');

  const [days, setDays] = useState<number>(30);
  const [platformMetric, setPlatformMetric] = useState<PlatformMetric>('signups');

  const providerActivity = useMetricsProviderTimeseries(platformMetric, days);
  const userStatuses = useMetricsBreakdown('userStatus');

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Platform activity
          </h2>
          <div role="group" aria-label="Platform metric" className="flex flex-wrap gap-1">
            {PLATFORM_METRICS.map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => setPlatformMetric(metric)}
                aria-pressed={platformMetric === metric}
                className={`${CHIP} ${platformMetric === metric ? CHIP_ON : CHIP_OFF}`}
              >
                {PLATFORM_LABELS[metric]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={PANEL_HEADING}>
            {platformMetric === 'users'
              ? 'Total user count'
              : `${PLATFORM_LABELS[platformMetric]} over time`}
          </h3>

          {platformMetric !== 'users' && (
            <div role="group" aria-label="Window" className="flex gap-1">
              {WINDOWS.map((window) => (
                <button
                  key={window}
                  type="button"
                  onClick={() => setDays(window)}
                  aria-pressed={days === window}
                  className={`${CHIP} ${days === window ? CHIP_ON : CHIP_OFF}`}
                >
                  {window} days
                </button>
              ))}
            </div>
          )}
        </div>

        {platformMetric === 'users' ? (
          <div className={`${FRAME} mt-3 p-5`}>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(providerActivity.data?.lines ?? []).map((line) => (
                <div key={line.provider} className="text-center">
                  <dt className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {USER_ROLE_LABELS[line.provider] ?? line.provider}
                  </dt>
                  <dd className="mt-1 text-2xl font-bold text-forest-900">
                    {(line.points[0]?.count ?? 0).toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="mt-6 grid gap-4 border-t border-forest-200 pt-5 sm:grid-cols-2 xl:grid-cols-4">
              {userStatuses.isPending || !userStatuses.data ? (
                Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
              ) : (
                <>
                  <StatCard
                    label="All accounts"
                    value={userStatuses.data.total}
                    className="text-center"
                  />
                  {USER_STATUSES.map((status) => (
                    <StatCard
                      key={status}
                      label={status}
                      value={
                        userStatuses.data?.slices.find((slice) => slice.label === status)?.count ??
                        0
                      }
                      className="text-center"
                    />
                  ))}
                </>
              )}
            </dl>
          </div>
        ) : (
          <div className="mt-3">
            <ProviderMetricChart
              label={`${PLATFORM_LABELS[platformMetric]}, last ${days} days`}
              lines={providerActivity.data?.lines ?? []}
              isPending={providerActivity.isPending}
              isFetching={providerActivity.isFetching}
              error={providerActivity.isError ? messageOf(providerActivity.error) : null}
            />
          </div>
        )}
      </section>
    </div>
  );
}
