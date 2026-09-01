import type { MetricPoint } from '@/services/admin.service';
import { format, parseISO } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CHART_GRID, CHART_INK, CHART_SERIES, CHART_TOOLTIP_BORDER } from './chart-theme';
import { BUTTON_SM, FRAME, MUTED, PANEL_HEADING } from './ui';

type MetricChartProps = {
  label: string;
  points: MetricPoint[];
  isPending?: boolean;
  /** Dimmed rather than replaced while a different window loads. */
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const PANEL = `${FRAME} p-5`;
const CHART_HEIGHT = 240;

/** 'Aug 3' — enough to place a point, short enough to fit ninety of them. */
function tick(date: string): string {
  return format(parseISO(date), 'MMM d');
}

/**
 * What the chart says, in words.
 *
 * An SVG line is nothing to a screen reader, and a table of ninety rows is not an
 * answer either. The total and the peak are what somebody reads a trend line for,
 * so those are what this says.
 */
function summary(label: string, points: MetricPoint[]): string {
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const peak = points.reduce((best, point) => (point.count > best.count ? point : best), {
    date: '',
    count: -1,
  });

  if (total === 0) return `${label}: nothing recorded in this window.`;

  return `${label}: ${total} in total across ${points.length} days, most on ${tick(
    peak.date
  )} with ${peak.count}.`;
}

/**
 * One line, with its own loading, empty and failed states.
 *
 * The states are here rather than in the page because every chart needs all of
 * them and a page that hand-rolls each one gets them subtly different.
 *
 * One hue and no legend: a count over time is magnitude, not identity, so there is
 * nothing to tell apart and the heading already names what is being counted. The
 * hover layer is the readable half for anybody who can see it — a trend line without
 * a tooltip makes the reader estimate values off an axis.
 */
export function MetricChart({
  label,
  points,
  isPending,
  isFetching,
  error,
  onRetry,
}: MetricChartProps) {
  if (error) {
    return (
      <div className={PANEL} role="alert">
        <h3 className={PANEL_HEADING}>{label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={`mt-3 ${BUTTON_SM}`}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className={`${PANEL} animate-pulse`} aria-hidden="true">
        <div className="h-3 w-28 rounded bg-forest-100" />
        <div className="mt-4 rounded bg-forest-50" style={{ height: CHART_HEIGHT }} />
      </div>
    );
  }

  const total = points.reduce((sum, point) => sum + point.count, 0);

  return (
    <figure className={`${PANEL} ${isFetching ? 'opacity-60' : ''}`}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <h3 className={PANEL_HEADING}>{label}</h3>
        <span className={MUTED}>{total.toLocaleString()} total</span>
      </figcaption>

      <p className="sr-only">{summary(label, points)}</p>

      {total === 0 ? (
        <p
          className="mt-4 flex items-center justify-center rounded-md bg-forest-50 text-sm font-semibold text-slate-600"
          style={{ height: CHART_HEIGHT }}
        >
          Nothing recorded in this window.
        </p>
      ) : (
        // Hidden from assistive tech: the paragraph above already says it, and an
        // SVG read aloud element by element is noise.
        <div className="mt-4" aria-hidden="true" style={{ height: CHART_HEIGHT }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_SERIES} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={CHART_SERIES} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {/* Solid hairline, horizontal only. Dashing a gridline adds noise and
                  reads as if the rule itself meant something. */}
              <CartesianGrid stroke={CHART_GRID} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={tick}
                // First and last always drawn, the rest thinned by recharts — a
                // ninety-day window cannot label every day and should not try.
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_INK, fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: CHART_INK, fontSize: 11 }}
              />
              <Tooltip
                labelFormatter={(date) => (typeof date === 'string' ? tick(date) : date)}
                formatter={(value) => [Number(value), label]}
                // The crosshair a line chart owes the reader: without it the only way
                // to read a value is to measure it against the axis by eye.
                cursor={{ stroke: CHART_SERIES, strokeWidth: 1 }}
                contentStyle={{
                  borderRadius: 6,
                  border: `1px solid ${CHART_TOOLTIP_BORDER}`,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={CHART_SERIES}
                strokeWidth={2}
                fill="url(#metricFill)"
                // Bigger than the 2px line, so the point under the cursor is a target
                // rather than a guess.
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
