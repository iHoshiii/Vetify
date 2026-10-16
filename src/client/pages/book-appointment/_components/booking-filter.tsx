import type { AppointmentStatus } from '@shared/schemas';

export type BookingFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

// What each filter narrows the list to. Turned-down sits with cancelled: both mean it is not happening.
export const FILTER_STATUSES: Record<BookingFilter, AppointmentStatus[] | undefined> = {
  all: undefined,
  pending: ['requested'],
  confirmed: ['confirmed'],
  completed: ['completed'],
  cancelled: ['cancelled', 'declined'],
};

const TABS: { key: BookingFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

// The status filter for the caller's own bookings, as a small tab strip.
export default function BookingFilterBar({
  value,
  onPick,
}: {
  value: BookingFilter;
  onPick: (key: BookingFilter) => void;
}) {
  return (
    <div
      className="flex max-w-full gap-1 overflow-x-auto pb-1"
      role="tablist"
      aria-label="Filter by status"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onPick(tab.key)}
          className={`min-h-11 shrink-0 grow rounded-md px-3 py-2 text-center text-sm font-medium transition ${
            value === tab.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
