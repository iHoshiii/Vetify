import {
  METRIC_SERIES,
  type BreakdownDimension,
  type MetricSeries,
  type UserRole,
} from '@shared/schemas';

import {
  countActiveAdmins,
  countActivityBetween,
  countActivityPerDay,
  countActivityPerDayByProvider,
  countBlogsBetween,
  countBlogsByStatus,
  countInquiriesByStatus,
  countInquiriesPerDay,
  countBlogsPerDay,
  countProfessionalsByStatus,
  countUsersBy,
  countAuditPerDay,
  type ActivityType,
  type DailyCount,
} from '../models';

/**
 * The dashboard's numbers, and only the reading of them — there is no function in
 * this file that writes anything.
 *
 * Every figure is counted from the collections that already hold it rather than
 * from a rollup kept alongside them. A second copy of a count is a second thing
 * that can be wrong, and the aggregations here are index-backed and cached, which
 * is cheaper than being subtly out of date.
 */

/** One figure against the same span before it. */
export type MetricTrend = {
  current: number;
  previous: number;
  /**
   * Percent movement, one decimal, or `null` when the previous span was empty.
   *
   * Null rather than 100: coming from zero has no percentage, and printing one
   * would put "+100%" on the first week the app was ever used.
   */
  change: number | null;
};

export type MetricsOverview = {
  days: number;
  /** When these numbers were counted — which, cached, is not when they were asked for. */
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

export type MetricsTimeseries = {
  metric: MetricSeries;
  days: number;
  /** Inclusive first day and last day of `points`, as 'YYYY-MM-DD'. */
  from: string;
  to: string;
  points: DailyCount[];
};

export type MetricsProviderTimeseries = {
  metric: 'signups' | 'logins' | 'applications' | 'users';
  days: number;
  from: string;
  to: string;
  lines: { provider: string; points: DailyCount[] }[];
};

export type MetricsBreakdown = {
  dimension: BreakdownDimension;
  /** The role it was narrowed to, echoed back, or null for every account. */
  role: UserRole | null;
  total: number;
  slices: { label: string; count: number }[];
};

/**
 * Which activity type each line is drawn from.
 *
 * 'blogs' is deliberately absent: no activity type is recorded for writing a
 * post, and one should not be. The posts themselves are permanent, so counting
 * them from the blogs collection stays correct past the 90-day event retention,
 * where an event-derived line would fall to zero and read as a dead blog.
 */
const SERIES_ACTIVITY: Record<Exclude<MetricSeries, 'blogs'>, ActivityType> = {
  signups: 'user.signed_up',
  logins: 'user.logged_in',
  chats: 'chat.message_sent',
  applications: 'professional.applied',
};

/**
 * What each breakdown slices, all of them a single grouped count.
 *
 * The three read from accounts take the role narrowing; the three that do not are
 * written as thunks that visibly drop it, rather than passed by reference and
 * silently handed an argument they have no field for.
 */
const BREAKDOWN_READS: Record<
  BreakdownDimension,
  (role?: UserRole) => Promise<Record<string, number>>
> = {
  provider: (role) => countUsersBy('provider', { role }),
  role: (role) => countUsersBy('role', { role }),
  userStatus: (role) => countUsersBy('status', { role }),
  blogStatus: () => countBlogsByStatus(),
  inquiryStatus: () => countInquiriesByStatus(),
  professionalStatus: () => countProfessionalsByStatus(),
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' in UTC, the same day key the aggregations group on. */
function isoDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

/**
 * The window a `days` count means: whole days, ending with today.
 *
 * Half-open, `[from, to)`, with `to` at tomorrow's midnight so today is counted in
 * full rather than up to the moment of the request — otherwise the last bar on
 * every chart is short for reasons that have nothing to do with the data, and it
 * grows while somebody watches it.
 *
 * `previousFrom` is the same span again, immediately before `from`, which is what
 * makes the comparison a comparison: 30 days against 30 days, not 30 against
 * however much history happens to exist.
 */
function windowOf(days: number, now: Date): { from: Date; to: Date; previousFrom: Date } {
  const to = new Date(startOfUtcDay(now).getTime() + DAY_MS);
  const from = new Date(to.getTime() - days * DAY_MS);

  return { from, to, previousFrom: new Date(from.getTime() - days * DAY_MS) };
}

/**
 * Every day in the window, including the empty ones.
 *
 * The aggregation can only return days that had rows. Handing those straight to a
 * chart draws a line that skips from Monday to Thursday as though Tuesday and
 * Wednesday were the same point — a quiet lie about a two-day outage.
 */
function fill(rows: DailyCount[], from: Date, days: number): DailyCount[] {
  const counted = new Map(rows.map((row) => [row.date, row.count]));

  return Array.from({ length: days }, (_, offset) => {
    const date = isoDay(new Date(from.getTime() + offset * DAY_MS));
    return { date, count: counted.get(date) ?? 0 };
  });
}

function trendOf(current: number, previous: number): MetricTrend {
  const change = previous === 0 ? null : Math.round(((current - previous) / previous) * 1000) / 10;
  return { current, previous, change };
}

function countSeriesBetween(metric: MetricSeries, from: Date, to: Date): Promise<number> {
  if (metric === 'blogs') return countBlogsBetween({ from, to });
  return countActivityBetween({ type: SERIES_ACTIVITY[metric], from, to });
}

function countSeriesPerDay(metric: MetricSeries, from: Date): Promise<DailyCount[]> {
  if (metric === 'blogs') return countBlogsPerDay({ from });
  return countActivityPerDay({ type: SERIES_ACTIVITY[metric], from });
}

/**
 * Sixty seconds of memory, per distinct question.
 *
 * The overview is fourteen counts and a reload costs all of them, so a dashboard
 * left open on a wall would scan the collections every few seconds forever. One
 * minute is short enough that a moderator watching a number move still sees it
 * move, and the pages where being current actually matters — the account list, the
 * queue, the audit trail — do not come through here.
 *
 * In-process, so each instance keeps its own; the values are counts, not
 * decisions, and two replicas being a few seconds apart on a chart is not a
 * correctness problem. The key space is bounded by the schemas — a day count
 * within the retention window, a metric or dimension from a fixed list — so this
 * cannot grow without bound no matter what a caller sends.
 */
const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();

  if (hit && now - hit.at < CACHE_TTL_MS) return hit.value as T;

  const value = await load();
  cache.set(key, { at: now, value });

  return value;
}

/**
 * Forget everything cached. For tests, which write rows and expect to see them,
 * and for a future admin "refresh" that means it.
 */
export function clearMetricsCache(): void {
  cache.clear();
}

function sum(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, count) => total + count, 0);
}

/**
 * The stat cards: what exists now, and how the last `days` compare with the
 * `days` before them.
 *
 * Totals come from the collections and are all-time; the trends come from the
 * window. They answer different questions on purpose — "how many accounts are
 * there" and "how many arrived this month" are both things a moderator wants, and
 * a single number cannot be both.
 *
 * `admins` counts the ones who can actually act: an admin who is suspended is not
 * cover for the last-admin guard, and the count that appears next to that guard on
 * the dashboard should be the same count the guard uses.
 */
export async function metricsOverview(days: number, now = new Date()): Promise<MetricsOverview> {
  return cached(`overview:${days}`, async () => {
    const { from, to, previousFrom } = windowOf(days, now);

    const [roles, blogs, applications, admins, current, previous] = await Promise.all([
      countUsersBy('role'),
      countBlogsByStatus(),
      countProfessionalsByStatus(),
      countActiveAdmins(),
      Promise.all(METRIC_SERIES.map((metric) => countSeriesBetween(metric, from, to))),
      Promise.all(METRIC_SERIES.map((metric) => countSeriesBetween(metric, previousFrom, from))),
    ]);

    const trend = Object.fromEntries(
      METRIC_SERIES.map((metric, index) => [
        metric,
        trendOf(current[index] ?? 0, previous[index] ?? 0),
      ])
    ) as Record<MetricSeries, MetricTrend>;

    return {
      days,
      generatedAt: new Date().toISOString(),
      totals: {
        users: sum(roles),
        admins,
        professionals: applications.verified ?? 0,
        pendingApplications: applications.pending ?? 0,
        blogs: sum(blogs),
        publishedBlogs: blogs.published ?? 0,
        flaggedBlogs: blogs.flagged ?? 0,
        // Hidden and removed only: a flagged post is held rather than moderated,
        // since nobody has decided anything about it yet.
        moderatedBlogs: (blogs.hidden ?? 0) + (blogs.removed ?? 0),
      },
      trend,
    };
  });
}

/**
 * One line on the chart: a count for every day in the window, oldest first.
 *
 * The window is derived here rather than taken from the caller, so the `days` a
 * client asked for and the days it gets back cannot disagree.
 */
export async function metricsTimeseries(
  metric: MetricSeries,
  days: number,
  now = new Date()
): Promise<MetricsTimeseries> {
  return cached(`timeseries:${metric}:${days}`, async () => {
    const { from, to } = windowOf(days, now);
    const points = fill(await countSeriesPerDay(metric, from), from, days);

    return {
      metric,
      days,
      from: isoDay(from),
      to: isoDay(new Date(to.getTime() - DAY_MS)),
      points,
    };
  });
}

/**
 * The sign-in methods a provider-split chart draws a line for, in legend order.
 *
 * Written out rather than taken from AUTH_PROVIDERS: this is the order the chart
 * reads in, and a provider with no events still owes the legend a flat line.
 */
const PROVIDER_LINES = ['facebook', 'tiktok', 'local', 'google'] as const;

export async function metricsProviderTimeseries(
  metric: 'signups' | 'logins' | 'applications' | 'users',
  days: number,
  now = new Date()
): Promise<MetricsProviderTimeseries> {
  return cached(`provider-timeseries:${metric}:${days}`, async () => {
    const { from, to } = windowOf(days, now);
    if (metric === 'users') {
      const roles = await countUsersBy('role');
      const date = isoDay(new Date(to.getTime() - DAY_MS));
      const roleLines = [
        { provider: 'admin', count: roles.admin ?? 0 },
        { provider: 'professionals', count: roles.professional ?? 0 },
        { provider: 'public', count: roles.user ?? 0 },
      ];
      return {
        metric,
        days,
        from: isoDay(from),
        to: date,
        lines: [
          ...roleLines.map(({ provider, count }) => ({ provider, points: [{ date, count }] })),
          {
            provider: 'total',
            points: [{ date, count: roleLines.reduce((sum, role) => sum + role.count, 0) }],
          },
        ],
      };
    }

    /**
     * The named lines, plus the 'total' drawn over them.
     *
     * The total is summed from the lines rather than counted again, so a line and
     * the total above it cannot disagree about the same day.
     */
    function seriesOf(
      named: { provider: string; rows: DailyCount[] }[]
    ): MetricsProviderTimeseries {
      const lines = named.map(({ provider, rows }) => ({
        provider,
        points: fill(rows, from, days),
      }));
      const totals = Array.from({ length: days }, (_, index) => ({
        date: lines[0]?.points[index]?.date ?? isoDay(new Date(from.getTime() + index * DAY_MS)),
        count: lines.reduce((sum, line) => sum + (line.points[index]?.count ?? 0), 0),
      }));

      return {
        metric,
        days,
        from: isoDay(from),
        to: isoDay(new Date(to.getTime() - DAY_MS)),
        lines: [...lines, { provider: 'total', points: totals }],
      };
    }

    // A phase is not a sign-in method, and the five phases are not read from one
    // place: enquiries are counted from their own rows, an application filed from the
    // activity events, and each verdict from the audit log, because a decision is
    // written down there and nowhere else.
    if (metric === 'applications') {
      const [requests, filed, accepted, rejected] = await Promise.all([
        countInquiriesPerDay({ from }),
        countActivityPerDay({ type: SERIES_ACTIVITY.applications, from }),
        countAuditPerDay('professional.verified', from),
        countAuditPerDay('professional.rejected', from),
      ]);

      const phases = seriesOf([
        { provider: 'request', rows: requests },
        { provider: 'application', rows: filed },
        { provider: 'accepted', rows: accepted },
        { provider: 'rejected', rows: rejected },
      ]);
      const named = phases.lines.filter((line) => line.provider !== 'total');
      const total = phases.lines.filter((line) => line.provider === 'total');
      const on = (provider: string, index: number) =>
        named.find((line) => line.provider === provider)?.points[index]?.count ?? 0;

      // Completed is the day's verdicts added, which is what the Completed queue holds:
      // every application that reached an end. Left out of the total on purpose, so a
      // decision is not counted once as its verdict and once again as an ending.
      const completed = {
        provider: 'completed',
        points: (named[0]?.points ?? []).map((point, index) => ({
          date: point.date,
          count: on('accepted', index) + on('rejected', index),
        })),
      };

      return { ...phases, lines: [...named, completed, ...total] };
    }

    const rows = await countActivityPerDayByProvider({ type: SERIES_ACTIVITY[metric], from });

    return seriesOf(
      PROVIDER_LINES.map((provider) => ({
        provider,
        rows: rows
          .filter((row) => row.provider === provider)
          .map(({ date, count }) => ({ date, count })),
      }))
    );
  });
}

/**
 * One breakdown chart: every value of a field, largest slice first.
 *
 * Ordered by size rather than by the enum, because the shape of the chart is the
 * point — and a status nobody is in is genuinely absent rather than a zero slice,
 * since a donut segment of zero is just a legend entry pretending to be data.
 */
export async function metricsBreakdown(
  dimension: BreakdownDimension,
  role?: UserRole
): Promise<MetricsBreakdown> {
  return cached(`breakdown:${dimension}:${role ?? 'any'}`, async () => {
    const counts = await BREAKDOWN_READS[dimension](role);

    const slices = Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort(
        (first, second) => second.count - first.count || first.label.localeCompare(second.label)
      );

    return { dimension, role: role ?? null, total: sum(counts), slices };
  });
}
