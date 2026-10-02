import { useId } from 'react';
import type { BookAffiliatePage } from '@shared/books';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const pesos = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-SG', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
const tooltipStyle = { border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 };
const tick = { fill: '#64748b', fontSize: 11 };
export default function AffiliateCharts({
  daily,
  topBooks,
}: Pick<BookAffiliatePage, 'daily' | 'topBooks'>) {
  const gradient = useId().replace(/:/g, '');
  const points = daily.map((point) => ({ ...point, earnings: point.earningsCentavos / 100 }));
  const total = points.reduce((sum, point) => sum + point.earnings, 0);
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <figure
        aria-label="Daily affiliate earnings for the last 30 days"
        className="min-w-0 rounded-xl border border-slate-200 p-4"
      >
        <figcaption className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Earnings trend</h2>
          <span className="text-[11px] text-slate-400">Last 30 days</span>
        </figcaption>
        <p className="mt-2 text-xl font-bold text-teal-900">{pesos(total)}</p>
        <div className="mt-4 h-52 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={points}
              accessibilityLayer
              margin={{ top: 8, right: 4, bottom: 0, left: -14 }}
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateLabel}
                tick={tick}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                tickFormatter={(value) => `₱${value}`}
                tick={tick}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, (max) => Math.max(2, Number(max))]}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => dateLabel(String(value))}
                formatter={(value) => [pesos(Number(value)), 'Earnings']}
              />
              <Area
                type="linear"
                dataKey="earnings"
                stroke="#0f766e"
                strokeWidth={2.5}
                fill={`url(#${gradient})`}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure
        aria-label="Top books by paid downloads"
        className="min-w-0 rounded-xl border border-slate-200 p-4"
      >
        <figcaption className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Top books</h2>
          <span className="text-[11px] text-slate-400">Paid downloads · All time</span>
        </figcaption>
        {topBooks.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-slate-400">
            No paid downloads yet
          </div>
        ) : (
          <div className="mt-4 h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={topBooks}
                layout="vertical"
                accessibilityLayer
                margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
                barSize={20}
              >
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="title"
                  type="category"
                  width={110}
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    String(value).length > 16 ? `${String(value).slice(0, 15)}…` : String(value)
                  }
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [Number(value).toLocaleString('en-PH'), 'Paid downloads']}
                  cursor={{ fill: '#f0fdfa' }}
                />
                <Bar
                  dataKey="downloads"
                  fill="#0f766e"
                  radius={[0, 5, 5, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </figure>
    </div>
  );
}
