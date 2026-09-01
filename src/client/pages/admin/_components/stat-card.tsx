import type { MetricTrend } from '@/services/admin.service';

import { CARD, LABEL, MUTED } from './ui';

type StatCardProps = {
  label: string;
  value: number;
  /** Movement against the previous span of the same length. Omitted for a figure
   * that has no window — a total is not up or down on anything. */
  trend?: MetricTrend;
  /** A second line under the number, for the detail the label cannot carry. */
  hint?: string;
};

/** Locale grouping, so 12400 reads as a number rather than a serial. */
function formatted(value: number): string {
  return value.toLocaleString();
}

/**
 * The movement line.
 *
 * A null change is printed as "no earlier activity" rather than as +100% or as
 * nothing: the previous span was empty, which is a fact worth showing on a young
 * install and not the same as flat.
 */
function Trend({ trend }: { trend: MetricTrend }) {
  if (trend.change === null) {
    return (
      <p className={`mt-2 ${MUTED}`}>
        {formatted(trend.current)} in this period, no earlier activity to compare
      </p>
    );
  }

  const up = trend.change > 0;
  const flat = trend.change === 0;
  // The console's own green for a rise, so movement reads in the palette the rest of
  // the page is drawn in rather than in a second, brighter one.
  const tone = flat ? 'text-slate-600' : up ? 'text-forest-700' : 'text-rose-700';

  return (
    <p className={`mt-2 text-xs font-bold ${tone}`}>
      {/* The arrow is decorative: the sign is already in the number beside it. */}
      <span aria-hidden="true">{flat ? '→' : up ? '↑' : '↓'}</span>{' '}
      {flat ? 'No change' : `${up ? '+' : ''}${trend.change}%`}
      <span className="font-semibold text-slate-600"> vs {formatted(trend.previous)} before</span>
    </p>
  );
}

/**
 * One number on the dashboard.
 *
 * The value is in a `<dd>` under a `<dt>` label because that is what these are — a
 * description list of figures — and it gives a screen reader the pairing without
 * any aria at all.
 */
export function StatCard({ label, value, trend, hint }: StatCardProps) {
  return (
    <div className={CARD}>
      <dt className={LABEL}>{label}</dt>
      {/* Proportional figures at this size, and tabular only where numbers have to
          line up vertically — a lone headline figure is read, not scanned down. */}
      <dd className="mt-2 text-3xl font-bold tracking-tight text-forest-900">{formatted(value)}</dd>
      {hint && <p className={`mt-2 ${MUTED}`}>{hint}</p>}
      {trend && <Trend trend={trend} />}
    </div>
  );
}

/** Same footprint, no numbers, so the row does not jump when they arrive. */
export function StatCardSkeleton() {
  return (
    <div className={`${CARD} animate-pulse`} aria-hidden="true">
      <div className="h-3 w-24 rounded bg-forest-100" />
      <div className="mt-3 h-8 w-16 rounded bg-forest-200" />
      <div className="mt-3 h-3 w-32 rounded bg-forest-100" />
    </div>
  );
}
