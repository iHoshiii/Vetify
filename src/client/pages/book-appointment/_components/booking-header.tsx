import { CalendarDays } from 'lucide-react';

import BookingIntro from './booking-intro';

// The intro and the appointments button share one compact header row.
export default function BookingHeader({
  appointmentsOpen,
  onAppointmentsToggle,
}: {
  appointmentsOpen: boolean;
  onAppointmentsToggle: () => void;
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <BookingIntro />
      </div>
      <button
        type="button"
        aria-expanded={appointmentsOpen}
        aria-controls="my-appointments"
        onClick={onAppointmentsToggle}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <CalendarDays className="h-4 w-4 text-teal-700" aria-hidden />
        <span className="hidden sm:inline">Your appointments</span>
        <span className="sm:hidden">Bookings</span>
      </button>
    </header>
  );
}
