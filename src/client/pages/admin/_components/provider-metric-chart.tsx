import type { MetricPoint } from '@/services/admin.service';
import { format, parseISO } from 'date-fns';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { CHART_GRID, CHART_INK, CHART_TOOLTIP_BORDER } from './chart-theme';
import { FRAME, MUTED, PANEL_HEADING } from './ui';

const COLORS: Record<string, string> = {
  facebook: '#2a78d6',
  tiktok: '#eda100',
  local: '#64748b',
  google: '#15803d',
  total: '#000000',
  pending: '#eda100',
  approved: '#15803d',
  rejected: '#e34948',
  admin: '#2a78d6',
  professionals: '#15803d',
  public: '#64748b',
};
const LABELS: Record<string, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  local: 'Local',
  google: 'Google',
  total: 'Total',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  admin: 'Admin',
  professionals: 'Professionals',
  public: 'Public users',
};

type Props = {
  label: string;
  lines: { provider: string; points: MetricPoint[] }[];
  isPending?: boolean;
  isFetching?: boolean;
  error?: string | null;
};

function tick(date: string): string {
  return format(parseISO(date), 'MMM d');
}

export function ProviderMetricChart({ label, lines, isPending, isFetching, error }: Props) {
  if (error)
    return (
      <div className={`${FRAME} p-5 text-sm text-slate-600`} role="alert">
        {error}
      </div>
    );
  if (isPending)
    return <div className={`${FRAME} h-72 animate-pulse bg-white`} aria-hidden="true" />;

  const dates = lines[0]?.points ?? [];
  const data = dates.map((point, index) =>
    Object.fromEntries([
      ['date', point.date],
      ...lines.map((line) => [line.provider, line.points[index]?.count ?? 0]),
    ])
  );

  return (
    <figure className={`${FRAME} p-5 ${isFetching ? 'opacity-60' : ''}`}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <h3 className={PANEL_HEADING}>{label}</h3>
        <span className={MUTED}>Daily activity</span>
      </figcaption>
      <div className="mt-4" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={CHART_GRID} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={tick}
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
              contentStyle={{
                borderRadius: 6,
                border: `1px solid ${CHART_TOOLTIP_BORDER}`,
                fontSize: 12,
              }}
            />
            <Legend formatter={(value) => LABELS[value] ?? value} />
            {lines.map((line) => (
              <Line
                key={line.provider}
                type="monotone"
                dataKey={line.provider}
                name={line.provider}
                stroke={COLORS[line.provider] ?? CHART_INK}
                strokeWidth={line.provider === 'total' ? 3 : 2}
                dot={line.points.length <= 1 ? { r: 4 } : false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
