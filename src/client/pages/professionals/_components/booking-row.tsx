import type { Appointment } from '@/services/appointments.service';
import type { AppointmentStatus } from '@shared/schemas';
import { Bell, Clock, Video } from 'lucide-react';

import { ACT_DANGER, ACT_PRIMARY, ACT_QUIET, type Action } from './booking-actions';

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

// Actions are keyed off the status rather than a flag, so a booking already answered offers nothing and no button can lead to a 409
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
    <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-2.5 sm:flex-row sm:items-center">
        <span className={`w-fit rounded border px-2 py-0.5 text-[11px] font-bold ${status.tone}`}>
          {status.label}
        </span>

        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
          <Clock className="h-3.5 w-3.5 text-teal-700" />
          {when(booking.startsAt)} · {minutes} min
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Client
          </span>
          <p className="font-bold text-slate-900">{booking.with?.name ?? 'Account deleted'}</p>
          <p className="text-slate-500">{booking.with?.email ?? '—'}</p>
          {/* Only there when the owner gave one, and the fastest way to settle something first */}
          {booking.phone && <p className="text-slate-500">{booking.phone}</p>}
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Pet patient
          </span>
          <p className="font-bold text-slate-900">
            {booking.petName} ({booking.petSpecies})
          </p>
        </div>
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs leading-5 text-slate-700">
        <strong className="font-bold text-slate-900">What it is about:</strong> {booking.reason}
      </p>

      {booking.refusalReason && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs leading-5 text-rose-900">
          <strong className="font-bold">
            {booking.cancelledByYou || booking.status !== 'cancelled' ? 'You said:' : 'They said:'}
          </strong>{' '}
          {booking.refusalReason}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <Bell className="h-3 w-3 text-teal-700" />
          Reminder {minutes} min prior
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {booking.status === 'requested' && (
            <>
              <button
                type="button"
                onClick={() => onAct(booking, 'confirm')}
                className={ACT_PRIMARY}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => onAct(booking, 'decline')}
                className={ACT_DANGER}
              >
                Turn down
              </button>
            </>
          )}

          {booking.status === 'confirmed' && (
            <>
              {booking.meetingUrl && (
                <a
                  href={booking.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 ${ACT_PRIMARY}`}
                >
                  <Video className="h-3 w-3" /> Join call
                </a>
              )}
              <button
                type="button"
                onClick={() => onAct(booking, 'complete')}
                className={ACT_QUIET}
              >
                Mark done
              </button>
              <button type="button" onClick={() => onAct(booking, 'cancel')} className={ACT_DANGER}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
