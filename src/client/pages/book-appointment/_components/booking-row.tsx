import type { Appointment } from '@/services/appointments.service';
import type { AppointmentStatus } from '@shared/schemas';
import { Link } from 'react-router-dom';

/** How each status reads, and how it looks. Past tense, because a status is a result. */
const STATUS: Record<AppointmentStatus, { label: string; tone: string }> = {
  requested: { label: 'Waiting on the vet', tone: 'bg-amber-100 text-amber-900' },
  confirmed: { label: 'Confirmed', tone: 'bg-emerald-100 text-emerald-900' },
  declined: { label: 'Turned down', tone: 'bg-rose-100 text-rose-900' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-700' },
  completed: { label: 'Done', tone: 'bg-slate-100 text-slate-700' },
};

/** The statuses still ahead of the owner, and so the only ones worth cancelling. */
const CANCELLABLE: AppointmentStatus[] = ['requested', 'confirmed'];

function when(at: string): string {
  return new Date(at).toLocaleString('en-PH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
}

/** One booking of the caller's, with the reason it went that way and the way out of it. */
export default function BookingRow({
  booking,
  onCancel,
}: {
  booking: Appointment;
  onCancel: (id: string) => void;
}) {
  const status = STATUS[booking.status];

  return (
    <li className="rounded-xl border border-slate-900/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-950">
            {booking.petName}
            <span className="font-normal text-slate-500"> &middot; {booking.petSpecies}</span>
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {when(booking.startsAt)} &middot;{' '}
            {booking.kind === 'virtual' ? 'Online consultation' : 'Clinic visit'}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            With{' '}
            <Link
              to={`/professionals/${booking.professionalId}`}
              className="font-semibold text-teal-800 hover:underline"
            >
              {booking.with?.name ?? booking.with?.email ?? 'a vet'}
            </Link>
          </p>
        </div>

        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.tone}`}>
          {status.label}
        </span>
      </div>

      {booking.refusalReason && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
          {booking.cancelledByYou ? 'You said: ' : 'They said: '}
          {booking.refusalReason}
        </p>
      )}

      {/* A link only once confirmed: on a booking nobody agreed to it links to nothing. */}
      {booking.status === 'confirmed' && booking.meetingUrl && (
        <a
          href={booking.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-9 items-center rounded-lg bg-teal-800 px-4 text-sm font-bold text-white hover:bg-teal-900"
        >
          Join the call
        </a>
      )}

      {CANCELLABLE.includes(booking.status) && (
        <button
          type="button"
          onClick={() => onCancel(booking.id)}
          className="mt-3 text-sm font-bold text-rose-700 hover:underline"
        >
          Cancel this booking
        </button>
      )}
    </li>
  );
}
