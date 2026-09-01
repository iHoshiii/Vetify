import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { CHART_GRID, CHART_INK, CHART_TOOLTIP_BORDER, toneOf } from './chart-theme';
import { BUTTON_SM, FRAME, MUTED, PANEL_HEADING } from './ui';

type BreakdownSlice = { label: string; count: number };

type BreakdownChartProps = {
  label: string;
  slices: BreakdownSlice[];
  total: number;
  isPending?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const PANEL = `${FRAME} p-5`;

/** 24px a bar plus its gap, floored so a two-slice split is not a stripe. */
const BAR_HEIGHT = 30;
const MIN_HEIGHT = 120;

/** Rounded to a whole number: a legend is not the place for 33.33%. */
function shareOf(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

/** Titles the raw enum value — 'pending' is a wire format, not a label. */
function titled(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * A split, drawn as horizontal bars and then listed.
 *
 * Bars rather than a donut, which is what this drew before. Three reasons, in order of
 * how much they matter:
 *
 *  1. Every label here is a word — 'interview', 'professional', 'suspended' — and a
 *     horizontal axis is the only place a word fits without being rotated or dropped.
 *  2. A reader compares two bars by length, which is a judgement people are good at.
 *     Two wedges are compared by angle, which they are not, and these splits routinely
 *     hold values a few percent apart.
 *  3. In a ring, any wedge can end up beside any other, so every pair of colours has
 *     to survive colour-blind simulation. The palette clears that gate for *adjacent*
 *     pairs and cannot clear it for all of them — deep emerald and red collapse under
 *     protanopia. In a bar chart only neighbours touch, which is the test the palette
 *     actually passes.
 *
 * The list below is not a fallback for the chart, it is the readable half: every slice
 * carries its count and its share as text, which is what makes the two lighter hues in
 * the palette legal on a white panel and what makes the figure work without colour
 * vision, without measuring, and in a jsdom test.
 */
export function BreakdownChart({
  label,
  slices,
  total,
  isPending,
  isFetching,
  error,
  onRetry,
}: BreakdownChartProps) {
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
        <div className="mt-4 rounded bg-forest-50" style={{ height: MIN_HEIGHT }} />
      </div>
    );
  }

  if (slices.length === 0) {
    return (
      <div className={PANEL}>
        <h3 className={PANEL_HEADING}>{label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Nothing to break down yet.</p>
      </div>
    );
  }

  // Grows with the data rather than squeezing it: a fixed height turns six statuses
  // into six hairlines and leaves whitespace under two.
  const height = Math.max(MIN_HEIGHT, slices.length * BAR_HEIGHT);

  return (
    <figure className={`${PANEL} ${isFetching ? 'opacity-60' : ''}`}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <h3 className={PANEL_HEADING}>{label}</h3>
        <span className={MUTED}>{total.toLocaleString()} total</span>
      </figcaption>

      <div className="mt-4" aria-hidden="true" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={slices}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            barCategoryGap="28%"
          >
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_INK, fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={92}
              tickFormatter={titled}
              tickLine={false}
              axisLine={false}
              tick={{ fill: CHART_INK, fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [Number(value), label]}
              labelFormatter={(name) => titled(String(name))}
              // A wash the width of the row, not a block: the highlight should say
              // which bar is under the cursor without hiding the bar.
              cursor={{ fill: CHART_GRID }}
              contentStyle={{
                borderRadius: 6,
                border: `1px solid ${CHART_TOOLTIP_BORDER}`,
                fontSize: 12,
              }}
            />
            {/* Rounded at the data end only. A bar rounded at the baseline too reads
                as floating free of the axis it is measured from. */}
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {slices.map((slice) => (
                <Cell key={slice.label} fill={toneOf(slice.label)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 space-y-2 border-t border-forest-100 pt-3">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: toneOf(slice.label) }}
              aria-hidden="true"
            />
            {/* The label wears an ink colour, never the slice's own: a coloured dot
                beside it already carries the identity, and coloured text at this size
                is a contrast problem for nothing. */}
            <span className="font-semibold text-slate-700">{titled(slice.label)}</span>
            <span className="ml-auto font-bold tabular-nums text-forest-900">
              {slice.count.toLocaleString()}
              <span className="ml-1.5 font-semibold text-slate-600">
                {shareOf(slice.count, total)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
