import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type BreakdownSlice = { label: string; count: number };

type BreakdownChartProps = {
  label: string;
  slices: BreakdownSlice[];
  total: number;
  /** Donut for a whole split into parts, bar when the labels are long. */
  variant?: 'donut' | 'bar';
  isPending?: boolean;
  isFetching?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const FRAME = 'rounded-lg border border-teal-900/10 bg-white p-5';
const CHART_HEIGHT = 220;

/**
 * Teal down to slate, in the order the slices arrive.
 *
 * The server sorts largest first, so the darkest colour always lands on the
 * biggest share and the legend below reads top to bottom in the same order.
 */
const COLOURS = ['#0f766e', '#14b8a6', '#5eead4', '#f59e0b', '#fb7185', '#94a3b8'];

function colourOf(index: number): string {
  return COLOURS[index % COLOURS.length] as string;
}

/** Rounded to a whole number: a legend is not the place for 33.33%. */
function shareOf(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

/** Titles the raw enum value — 'pending' is a wire format, not a label. */
function titled(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * A split, drawn and then listed.
 *
 * The list is not a fallback for the chart — it is the readable half. Every slice
 * gets its count and its share as text, so the figure works without colour
 * vision, without the SVG measuring, and in a jsdom test.
 */
export function BreakdownChart({
  label,
  slices,
  total,
  variant = 'donut',
  isPending,
  isFetching,
  error,
  onRetry,
}: BreakdownChartProps) {
  if (error) {
    return (
      <div className={FRAME} role="alert">
        <h3 className="text-sm font-black tracking-tight text-slate-950">{label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-md bg-teal-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-900"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isPending) {
    return (
      <div className={`${FRAME} animate-pulse`} aria-hidden="true">
        <div className="h-3 w-28 rounded bg-slate-200" />
        <div className="mt-4 rounded bg-teal-900/5" style={{ height: CHART_HEIGHT }} />
      </div>
    );
  }

  if (slices.length === 0) {
    return (
      <div className={FRAME}>
        <h3 className="text-sm font-black tracking-tight text-slate-950">{label}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">Nothing to break down yet.</p>
      </div>
    );
  }

  return (
    <figure className={`${FRAME} ${isFetching ? 'opacity-60' : ''}`}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-black tracking-tight text-slate-950">{label}</h3>
        <span className="text-xs font-bold text-slate-500">{total.toLocaleString()} total</span>
      </figcaption>

      <div className="mt-4" aria-hidden="true" style={{ height: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height="100%">
          {variant === 'donut' ? (
            <PieChart>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="label"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                stroke="none"
              >
                {slices.map((slice, index) => (
                  <Cell key={slice.label} fill={colourOf(index)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [Number(value), titled(String(name))]}
                contentStyle={{ borderRadius: 8, border: '1px solid #ccfbf1', fontSize: 12 }}
              />
            </PieChart>
          ) : (
            // Horizontal bars, because these labels are words and a vertical axis
            // is the only place a word fits without rotating it.
            <BarChart
              data={slices}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
            >
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={92}
                tickFormatter={titled}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
              />
              <Tooltip
                formatter={(value) => [Number(value), label]}
                labelFormatter={(name) => titled(String(name))}
                contentStyle={{ borderRadius: 8, border: '1px solid #ccfbf1', fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {slices.map((slice, index) => (
                  <Cell key={slice.label} fill={colourOf(index)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <ul className="mt-4 space-y-2">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colourOf(index) }}
              aria-hidden="true"
            />
            <span className="font-semibold text-slate-700">{titled(slice.label)}</span>
            <span className="ml-auto font-bold text-slate-950">
              {slice.count.toLocaleString()}
              <span className="ml-1.5 font-semibold text-slate-500">
                {shareOf(slice.count, total)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
