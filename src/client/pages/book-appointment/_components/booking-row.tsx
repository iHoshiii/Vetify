import type { Appointment } from '@/services/appointments.service';
import type { AppointmentStatus } from '@shared/schemas';
import { Link } from 'react-router-dom';
import { useLocalePreferences } from '@/components/providers/LocaleProvider';

import StartSessionButton from '@/pages/call/start-session-button';

// How each status reads, and a muted badge tone to carry it. Past tense: a status is a result.
const STATUS: Record<AppointmentStatus, { label: string; tone: string }> = {
  requested: { label: 'Waiting on the vet', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  confirmed: { label: 'Confirmed', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  declined: { label: 'Turned down', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  cancelled: { label: 'Cancelled', tone: 'border-slate-200 bg-slate-50 text-slate-600' },
  completed: { label: 'Done', tone: 'border-slate-200 bg-slate-50 text-slate-600' },
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

        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${status.tone}`}
        >
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
              className="text-sm font-medium text-rose-600 hover:underline"
            >
              Cancel this booking
            </button>
          )}
        </div>
      )}
    </li>
  );
}
