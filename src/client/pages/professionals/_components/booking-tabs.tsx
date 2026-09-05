import type { AppointmentStatus } from '@shared/schemas';

export type BookingTab = { key: string; label: string; statuses: readonly AppointmentStatus[] };

// Turned down and called off are the same news to whoever asked, so they share one tab rather than leaving cancellations with nowhere to be read
export const BOOKING_TABS: readonly BookingTab[] = [
  { key: 'request', label: 'Request', statuses: ['requested'] },
  { key: 'scheduled', label: 'Scheduled', statuses: ['confirmed'] },
  { key: 'rejected', label: 'Rejected', statuses: ['declined', 'cancelled'] },
  { key: 'completed', label: 'Completed', statuses: ['completed'] },
];

const TAB =
  'flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1 font-bold transition-colors';
const TAB_ON = 'bg-white text-slate-900 shadow-xs';
const TAB_OFF = 'text-slate-600 hover:text-slate-900';
const BADGE = 'rounded-full px-1.5 text-[10px] font-black';

export function tabCount(tab: BookingTab, counts?: Record<AppointmentStatus, number>): number {
  if (!counts) return 0;
  return tab.statuses.reduce((total, status) => total + counts[status], 0);
}

export default function BookingTabs({
  active,
  counts,
  onPick,
}: {
  active: BookingTab;
  counts?: Record<AppointmentStatus, number>;
  onPick: (tab: BookingTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
      {BOOKING_TABS.map((tab) => {
        const on = tab.key === active.key;
        const count = tabCount(tab, counts);

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onPick(tab)}
            className={`${TAB} ${on ? TAB_ON : TAB_OFF}`}
          >
            {tab.label}
            {/* Only drawn when there is something to count, so empty tabs show no zeroes */}
            {count > 0 && (
              <span
                className={`${BADGE} ${
                  tab.key === 'request' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
