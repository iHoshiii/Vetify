import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useHealth } from '@/hooks/useHealth';

import { CARD, PANEL_HEADING } from './_components/ui';

const DB_TONE: Record<string, string> = {
  connected: 'bg-forest-100 text-forest-800',
  disconnected: 'bg-rose-50 text-rose-800',
  uninitialized: 'bg-amber-50 text-amber-800',
};

function uptimeOf(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** The admin landing is reserved for system health. Metrics live in Statistics. */
export default function AdminDashboardPage() {
  useDocumentTitle('Admin overview', 'System status.');
  const health = useHealth();

  return (
    <section className={CARD}>
      <h2 className={PANEL_HEADING}>System status</h2>

      <dl className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
        <div className="flex items-center gap-2">
          <dt className="font-semibold text-slate-600">Database</dt>
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
          <dt className="font-semibold text-slate-600">API uptime</dt>
          <dd className="font-bold text-slate-950">
            {health.data ? uptimeOf(health.data.uptime) : '—'}
          </dd>
        </div>
      </dl>
    </section>
  );
}
