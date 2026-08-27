import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Activity, Bell, CalendarCheck, MessageSquare, UserCog } from 'lucide-react';

import { SAMPLE_HISTORY, type HistoryKind } from './_components/console-sample-data';

const KIND_ICON: Record<HistoryKind, typeof Activity> = {
  booking: CalendarCheck,
  message: MessageSquare,
  reminder: Bell,
  profile: UserCog,
};

const KIND_CLASS: Record<HistoryKind, string> = {
  booking: 'bg-teal-50 text-teal-800 border-teal-200',
  message: 'bg-blue-50 text-blue-800 border-blue-200',
  reminder: 'bg-amber-50 text-amber-800 border-amber-200',
  profile: 'bg-slate-100 text-slate-700 border-slate-200',
};

/** Everything recorded against the account, newest first. */
export default function ProfessionalHistoryPage() {
  useDocumentTitle('History & Logs', 'Everything recorded against your professional account.');

  const entries = SAMPLE_HISTORY;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
          <Activity className="h-4 w-4 text-teal-800" />
          History &amp; Logs
        </h1>
        <p className="text-xs text-slate-500">
          Everything recorded against your account, newest first.
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">Nothing recorded yet.</p>
      ) : (
        <ol className="space-y-3">
          {entries.map((entry) => {
            const Icon = KIND_ICON[entry.kind];
            return (
              <li key={entry.id} className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                    KIND_CLASS[entry.kind]
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0 flex-1 border-b border-slate-100 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">{entry.summary}</p>
                    <span className="shrink-0 text-[11px] text-slate-400">{entry.at}</span>
                  </div>
                  {entry.detail && (
                    <p className="mt-0.5 text-[11px] text-slate-500">{entry.detail}</p>
                  )}
                  <span className="mt-1 inline-block font-mono text-[10px] text-slate-400">
                    {entry.id}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
