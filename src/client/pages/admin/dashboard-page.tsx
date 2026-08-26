import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  useMetricsBreakdown,
  useMetricsOverview,
  useMetricsTimeseries,
} from '@/hooks/useAdminMetrics';
import { useHealth } from '@/hooks/useHealth';
import { METRIC_SERIES, type MetricSeries } from '@shared/schemas';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { BreakdownChart } from './_components/breakdown-chart';
import { MetricChart } from './_components/metric-chart';
import { StatCard, StatCardSkeleton } from './_components/stat-card';

/**
 * A week, a month, a quarter.
 *
 * 90 is the ceiling because that is how long raw events are kept — a longer
 * window would draw a line that is honest for 90 days and flat zero before it.
 */
const WINDOWS = [7, 30, 90] as const;

/** Chart legends, not wire names: 'signups' is the token, 'Signups' is the label. */
const SERIES_LABEL: Record<MetricSeries, string> = {
  signups: 'Signups',
  logins: 'Sign-ins',
  chats: 'Chat messages',
  blogs: 'Posts written',
  applications: 'Applications',
};

const TAB = 'rounded-md px-3 py-1.5 text-xs font-bold transition-colors';
const TAB_ON = 'bg-teal-900 text-white';
const TAB_OFF = 'text-slate-600 hover:bg-teal-900/5 hover:text-teal-900';

const DB_TONE: Record<string, string> = {
  connected: 'bg-emerald-50 text-emerald-800',
  disconnected: 'bg-rose-50 text-rose-800',
  uninitialized: 'bg-amber-50 text-amber-800',
};

/** '3h 12m' — a dashboard wants the shape of the uptime, not the seconds. */
function uptimeOf(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * A queue with something sitting in it.
 *
 * The only actionable thing on an otherwise read-only page, so it says how many
 * and links into the list rather than leaving a number to be interpreted. Absent
 * at zero, because an empty queue is not news.
 */
function Waiting({
  count,
  noun,
  tail,
  to,
}: {
  count: number;
  noun: string;
  tail: string;
  to: string;
}) {
  if (count === 0) return null;

  return (
    <section className="rounded-lg border border-amber-300/60 bg-amber-50 p-5">
      <h2 className="text-sm font-black tracking-tight text-amber-900">
        {count} {noun}
        {count === 1 ? '' : 's'} {tail}
      </h2>
      <Link
        to={to}
        className="mt-2 inline-block text-sm font-bold text-amber-900 underline hover:no-underline"
      >
        Open the queue
      </Link>
    </section>
  );
}

/**
 * The landing: what the platform is, and what it has been doing lately.
 *
 * The window control drives the totals and the line together, so the trend on a
 * card and the shape above it are always measuring the same span. Nothing here is
 * actionable — the pages that act on a specific row read it fresh, which is why a
 * minute-old cached aggregate is fine on this page and not on those.
 */
export default function AdminDashboardPage() {
  useDocumentTitle('Admin overview', 'Platform metrics and system health.');

  const [days, setDays] = useState<number>(30);
  const [metric, setMetric] = useState<MetricSeries>('signups');

  const overview = useMetricsOverview(days);
  const series = useMetricsTimeseries(metric, days);
  const health = useHealth();

  const roles = useMetricsBreakdown('role');
  const providers = useMetricsBreakdown('provider');
  const posts = useMetricsBreakdown('blogStatus');
  const applications = useMetricsBreakdown('professionalStatus');

  const totals = overview.data?.totals;
  const trend = overview.data?.trend;
  const pending = totals?.pendingApplications ?? 0;
  const held = totals?.flaggedBlogs ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-tight">Last {days} days</h2>

          <div role="group" aria-label="Window" className="flex gap-1">
            {WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setDays(window)}
                aria-pressed={days === window}
                className={`${TAB} ${days === window ? TAB_ON : TAB_OFF}`}
              >
                {window} days
              </button>
            ))}
          </div>
        </div>

        {overview.isError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-teal-900/10 bg-white p-6 text-sm"
          >
            <p className="font-semibold text-slate-700">{messageOf(overview.error)}</p>
            <button
              type="button"
              onClick={() => void overview.refetch()}
              className="mt-3 rounded-md bg-teal-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-900"
            >
              Try again
            </button>
          </div>
        ) : (
          <dl
            className={`mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 ${
              overview.isFetching ? 'opacity-60' : ''
            }`}
          >
            {overview.isPending || !totals || !trend ? (
              Array.from({ length: 4 }, (_, index) => <StatCardSkeleton key={index} />)
            ) : (
              <>
                <StatCard
                  label="Accounts"
                  value={totals.users}
                  trend={trend.signups}
                  hint={`${totals.professionals} professional, ${totals.admins} admin`}
                />
                <StatCard label="Sign-ins" value={trend.logins.current} trend={trend.logins} />
                <StatCard label="Chat messages" value={trend.chats.current} trend={trend.chats} />
                <StatCard
                  label="Posts"
                  value={totals.blogs}
                  trend={trend.blogs}
                  hint={`${totals.publishedBlogs} live, ${totals.flaggedBlogs} held, ${totals.moderatedBlogs} moderated`}
                />
              </>
            )}
          </dl>
        )}
      </section>

      <Waiting
        count={pending}
        noun="application"
        tail="waiting on a decision"
        to="/admin/users/applications"
      />
      {/* Posts the screen would not pass. Linked with the filter already applied,
          because the queue is a view of the post list rather than a page. */}
      <Waiting count={held} noun="post" tail="held for review" to="/admin/blogs?status=flagged" />

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-tight">Activity</h2>

          <div role="group" aria-label="Metric" className="flex flex-wrap gap-1">
            {METRIC_SERIES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMetric(option)}
                aria-pressed={metric === option}
                className={`${TAB} ${metric === option ? TAB_ON : TAB_OFF}`}
              >
                {SERIES_LABEL[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <MetricChart
            label={SERIES_LABEL[metric]}
            points={series.data?.points ?? []}
            isPending={series.isPending}
            isFetching={series.isFetching}
            error={series.isError ? messageOf(series.error) : null}
            onRetry={() => void series.refetch()}
          />
        </div>

        {/* Said once, here, rather than on each chart: events age out, and a line
            that stops at 90 days is retention and not a quiet platform. */}
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Signups, sign-ins, chats and applications are counted from activity events, which are kept
          for 90 days. Posts are counted from the posts themselves, so that line goes back further
          than the events do.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-black tracking-tight">Composition</h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BreakdownChart
            label="Accounts by role"
            slices={roles.data?.slices ?? []}
            total={roles.data?.total ?? 0}
            isPending={roles.isPending}
            error={roles.isError ? messageOf(roles.error) : null}
            onRetry={() => void roles.refetch()}
          />
          <BreakdownChart
            label="Accounts by sign-in method"
            slices={providers.data?.slices ?? []}
            total={providers.data?.total ?? 0}
            isPending={providers.isPending}
            error={providers.isError ? messageOf(providers.error) : null}
            onRetry={() => void providers.refetch()}
          />
          <BreakdownChart
            label="Posts by status"
            variant="bar"
            slices={posts.data?.slices ?? []}
            total={posts.data?.total ?? 0}
            isPending={posts.isPending}
            error={posts.isError ? messageOf(posts.error) : null}
            onRetry={() => void posts.refetch()}
          />
          <BreakdownChart
            label="Applications by status"
            variant="bar"
            slices={applications.data?.slices ?? []}
            total={applications.data?.total ?? 0}
            isPending={applications.isPending}
            error={applications.isError ? messageOf(applications.error) : null}
            onRetry={() => void applications.refetch()}
          />
        </div>
      </section>

      <section className="rounded-lg border border-teal-900/10 bg-white p-5">
        <h2 className="text-sm font-black tracking-tight">System</h2>

        {/* Polled, and 'unreachable' when the poll itself fails — a health check
            that cannot be fetched is a health answer, not a blank space. */}
        <dl className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <div className="flex items-center gap-2">
            <dt className="font-semibold text-slate-500">Database</dt>
            <dd>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  health.isError
                    ? DB_TONE.disconnected
                    : DB_TONE[health.data?.db ?? 'uninitialized'] ?? DB_TONE.uninitialized
                }`}
              >
                {health.isError ? 'unreachable' : health.data?.db ?? 'checking'}
              </span>
            </dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="font-semibold text-slate-500">API uptime</dt>
            <dd className="font-bold text-slate-950">
              {health.data ? uptimeOf(health.data.uptime) : '\u2014'}
            </dd>
          </div>

          <div className="flex items-center gap-2">
            <dt className="font-semibold text-slate-500">Metrics generated</dt>
            <dd className="font-bold text-slate-950">
              {overview.data ? new Date(overview.data.generatedAt).toLocaleTimeString() : '\u2014'}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs font-semibold text-slate-500">
          Aggregates are cached for a minute, so the generated time can trail the clock. The lists
          read live.
        </p>
      </section>
    </div>
  );
}
