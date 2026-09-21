import type { Appointment } from '@/services/appointments.service';
import type { AppointmentStatus } from '@shared/schemas';
import { Clock } from 'lucide-react';

import type { Action } from './booking-actions';
import BookingRowActions from './booking-row-actions';

// Past tense where the status is a result, present where somebody is still waiting
const STATUS: Record<AppointmentStatus, { label: string; tone: string }> = {
  requested: { label: 'Waiting on you', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  declined: { label: 'Turned down', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  completed: { label: 'Done', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

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

// A pet line the vet reads at a glance: name and species, with breed and age only where given.
function petLine(booking: Appointment): string {
  const head = booking.petName ? `${booking.petName} (${booking.petSpecies})` : booking.petSpecies;
  const rest = [booking.petBreed, booking.petAge].filter(Boolean).join(', ');
  return rest ? `${head} · ${rest}` : head;
}

export default function BookingRow({
  booking,
  minutes,
  onAct,
}: {
  booking: Appointment;
  minutes: number;
  onAct: (booking: Appointment, action: Action) => void;
}) {
  const status = STATUS[booking.status];

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${status.tone}`}>
          {status.label}
        </span>
        <span className="font-bold text-slate-900">{booking.with?.name ?? 'Account deleted'}</span>
        <span className="ml-auto flex items-center gap-1 font-bold text-teal-900">
          <Clock className="h-3.5 w-3.5 text-teal-700" />
          {when(booking.startsAt)} · {minutes} min
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-600">
        {petLine(booking)}
        <span className="text-slate-400"> — </span>
        {booking.with?.email ?? '—'}
        {booking.phone && ` · ${booking.phone}`}
      </p>

      <p className="mt-1.5 text-xs leading-5 text-slate-700">
        <span className="font-bold text-slate-900">Reason:</span> {booking.reason}
      </p>

      {booking.refusalReason && (
        <p className="mt-1.5 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs leading-5 text-rose-900">
          <strong className="font-bold">
            {booking.cancelledByYou || booking.status !== 'cancelled' ? 'You said:' : 'They said:'}
          </strong>{' '}
          {booking.refusalReason}
        </p>
      )}

      {(booking.status === 'requested' || booking.status === 'confirmed') && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <BookingRowActions booking={booking} onAct={onAct} />
        </div>
      )}
    </li>
  );
}
