import {
  useMetricsBreakdown,
  useMetricsProviderTimeseries,
  useMetricsTimeseries,
} from '@/hooks/useAdminMetrics';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { USER_STATUSES, type MetricSeries } from '@shared/schemas';
import { useState } from 'react';

import { MetricChart } from '../_components/metric-chart';
import { ProviderMetricChart } from '../_components/provider-metric-chart';
import { StatCard, StatCardSkeleton } from '../_components/stat-card';
import { CHIP, CHIP_OFF, CHIP_ON, FRAME, LEDE, MUTED, PANEL_HEADING } from '../_components/ui';

/**
 * A week, a month, a quarter.
 *
 * 90 is the ceiling because that is how long raw activity events are kept — a longer
 * window would draw a line that is honest for 90 days and flat zero behind it.
 */
const WINDOWS = [7, 30, 90] as const;
const PLATFORM_METRICS = ['signups', 'logins', 'users', 'blogs', 'applications'] as const;
type PlatformMetric = (typeof PLATFORM_METRICS)[number];
const PLATFORM_LABELS: Record<PlatformMetric, string> = {
  signups: 'Signups',
  logins: 'Sign-ins',
  users: 'Users',
  blogs: 'Posts written',
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

/**
 * Every platform figure in one place: what arrives, who is signed up, and how the
 * licence pipeline is moving.
 *
 * Its own workspace in the sidebar rather than a strip of charts under whichever
 * queue happened to be open, which is where these lived. A chart is read
 * deliberately — you go to it with a question — and under a queue it was scrolled
 * past on the way to a pager, read by accident or not at all.
 *
 * One chart at a time, picked by the chips, because five charts down a page makes a
 * reader hunt for the one they came for. Signups, sign-ins and applications each
 * split into a line per source with a total drawn over them — the split is the
 * question worth asking of them, since a flat total can hide one provider collapsing
 * while another picks it up. Posts have no such split, and Users is a count of what
 * exists now rather than a series at all.
 *
 * The window drives the line only, and is absent on Users: "how many accounts in the
 * last 7 days" is a different question from the one that view answers.
 */
export default function StatisticsTab() {
  useDocumentTitle('Admin application statistics', 'How the licence pipeline is moving.');

  const [days, setDays] = useState<number>(30);
  const [platformMetric, setPlatformMetric] = useState<PlatformMetric>('signups');

  // Both read on every metric, because a hook cannot be skipped, and only the one the
  // chips are on is drawn. The other is a cached read the next chip may well want.
  const plain: MetricSeries = platformMetric === 'users' ? 'signups' : platformMetric;
  const activity = useMetricsTimeseries(plain, days);
  const providerActivity = useMetricsProviderTimeseries(
    platformMetric === 'blogs' ? 'signups' : platformMetric,
    days
  );
  const userStatuses = useMetricsBreakdown('userStatus');

  return (
    <div className="space-y-6">
      <p className={LEDE}>
        How much the platform is taking in, and where it ends up. The chips pick what is being
        counted; the window picks how far back the line runs.
      </p>

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
        ) : platformMetric === 'blogs' ? (
          // The one metric counted from the rows rather than from events, so there is no
          // source to split it by: one line, and the plain chart that draws one line.
          <div className="mt-3">
            <MetricChart
              label={`${PLATFORM_LABELS[platformMetric]}, last ${days} days`}
              points={activity.data?.points ?? []}
              isPending={activity.isPending}
              isFetching={activity.isFetching}
              error={activity.isError ? messageOf(activity.error) : null}
              onRetry={() => void activity.refetch()}
            />
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

        <p className={`mt-2 ${MUTED}`}>
          Signups, sign-ins and applications are counted from activity events, which are kept for 90
          days — a line that stops at the left edge is that retention window, not a quiet fortnight.
          Posts and account totals are counted from the records themselves, so they go back as far
          as those do.
        </p>
      </section>
    </div>
  );
}
