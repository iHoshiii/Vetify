import type { Appointment } from '@/services/appointments.service';
import type { AppointmentStatus } from '@shared/schemas';
import { Link } from 'react-router-dom';
import { useLocalePreferences } from '@/components/providers/LocaleProvider';

import StartSessionButton from '@/pages/call/start-session-button';

// Status label and a small dot color, no pill fill.
const STATUS: Record<AppointmentStatus, { label: string; dot: string }> = {
  requested: { label: 'Pending', dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmed', dot: 'bg-emerald-500' },
  declined: { label: 'Declined', dot: 'bg-rose-500' },
  cancelled: { label: 'Cancelled', dot: 'bg-slate-400' },
  completed: { label: 'Completed', dot: 'bg-slate-400' },
};

// The statuses still ahead of the owner, and so the only ones worth cancelling.
const CANCELLABLE: AppointmentStatus[] = ['requested', 'confirmed'];

function when(at: string, locale: string, timeZone: string): string {
  return new Date(at).toLocaleString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

// One booking of the caller's, with the reason it went that way and the way out of it.
export default function BookingRow({
  booking,
  onCancel,
}: {
  booking: Appointment;
  onCancel: (id: string) => void;
}) {
  const { locale, timeZone } = useLocalePreferences();
  const status = STATUS[booking.status];

  return (
    <li className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {booking.petName}
            <span className="font-normal text-slate-500"> &middot; {booking.petSpecies}</span>
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {when(booking.startsAt, locale, timeZone)} &middot;{' '}
            {booking.kind === 'virtual' ? 'Online consultation' : 'Clinic visit'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            With{' '}
            <Link
              to={`/professionals/${booking.professionalId}`}
              className="font-medium text-teal-700 hover:underline"
            >
              {booking.with?.name ?? booking.with?.email ?? 'a vet'}
            </Link>
          </p>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
          {status.label}
        </span>
      </div>

      {booking.refusalReason && (
        <p className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-medium text-slate-700">
            {booking.cancelledByYou ? 'You said: ' : 'They said: '}
          </span>
          {booking.refusalReason}
        </p>
      )}

      {/* Actions sit on one row so the Start button and the cancel link stay aligned and separately clickable. */}
      {((booking.status === 'confirmed' && booking.kind === 'virtual') ||
        CANCELLABLE.includes(booking.status)) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {booking.status === 'confirmed' && booking.kind === 'virtual' && (
            <StartSessionButton
              appointmentId={booking.id}
              startsAt={booking.startsAt}
              minutes={booking.minutes}
            />
          )}

          {CANCELLABLE.includes(booking.status) && (
            <button
              type="button"
              onClick={() => onCancel(booking.id)}
              className="inline-flex h-9 items-center rounded-lg bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700"
            >
              Cancel this booking
            </button>
          )}
        </div>
      )}
    </li>
  );
}
