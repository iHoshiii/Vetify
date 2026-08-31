import { CalendarDays } from 'lucide-react';

import BookingIntro from './booking-intro';

/** The introduction and appointment-list control share the booking page header. */
export default function BookingHeader({
  appointmentsOpen,
  onAppointmentsToggle,
}: {
  appointmentsOpen: boolean;
  onAppointmentsToggle: () => void;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <BookingIntro />
      </div>
      <button
        type="button"
        aria-expanded={appointmentsOpen}
        aria-controls="my-appointments"
        onClick={onAppointmentsToggle}
        className="inline-flex self-start items-center gap-2 rounded-lg border border-teal-800 bg-white px-3 py-2 text-sm font-bold text-teal-900 transition hover:bg-teal-50"
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
        Your appointments
      </button>
    </header>
  );
}
