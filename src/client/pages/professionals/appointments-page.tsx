import {
  useCancelAppointment,
  useDecideAppointment,
  useIncomingAppointments,
} from '@/hooks/useAppointments';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Appointment, AppointmentDecision } from '@/services/appointments.service';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@shared/schemas';
import { Bell, CalendarCheck, Clock, Video } from 'lucide-react';
import { useState } from 'react';

import { useConsoleApplication } from './professional-layout';

const FILTERS: Array<AppointmentStatus | 'all'> = ['all', ...APPOINTMENT_STATUSES];

/** Past tense where the status is a result, present where somebody is still waiting. */
const STATUS: Record<AppointmentStatus, { label: string; tone: string }> = {
  requested: { label: 'Waiting on you', tone: 'bg-amber-100 text-amber-800 border-amber-200' },
  confirmed: { label: 'Confirmed', tone: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  declined: { label: 'Turned down', tone: 'bg-rose-100 text-rose-800 border-rose-200' },
  cancelled: { label: 'Cancelled', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
  completed: { label: 'Done', tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

/**
 * What each button asks for before it will act.
 *
 * The server refuses a decline without a reason and a virtual confirmation without a
 * link, so asking is not politeness — it is the difference between a form and a 400.
 * Confirming a clinic visit needs nothing, which is why the need is decided per booking
 * rather than per action.
 */
type Action = AppointmentDecision | 'cancel';

/** An action waiting on something typed, and what to call the box. */
type Ask = { booking: Appointment; action: Action; label: string; placeholder: string };

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

function Metric({
  label,
  value,
  valueClass = 'text-slate-900',
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`mt-1 text-2xl font-black ${valueClass}`}>{value}</dd>
    </div>
  );
}

const ACT = 'rounded px-3 py-1 text-xs font-bold transition-colors';
const ACT_PRIMARY = `${ACT} bg-teal-800 text-white hover:bg-teal-900`;
const ACT_QUIET = `${ACT} bg-slate-100 text-slate-800 hover:bg-slate-200`;
const ACT_DANGER = `${ACT} text-rose-600 hover:bg-rose-50`;

/**
 * One booking, with whatever answers it is still open to.
 *
 * The actions are keyed off the status rather than off a flag, so a booking already
 * answered offers nothing — the same rule the server enforces, expressed once here so
 * a button never leads to a 409.
 *
 * Every button calls the same `onAct`. Whether an action needs something typed first is
 * decided by the page, in one place, rather than half here and half there.
 */
function Row({
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
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded border px-2 py-0.5 text-[11px] font-bold ${status.tone}`}>
            {status.label}
          </span>
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {booking.kind === 'virtual' ? 'Online consultation' : 'Clinic visit'}
          </span>
        </div>

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
          {/* Only present when the owner chose to give one, and worth showing plainly:
              it is the fastest way to settle something before the appointment. */}
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
            {booking.cancelledByYou
              ? 'You said:'
              : booking.status === 'cancelled'
              ? 'They said:'
              : 'You said:'}
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

/**
 * What an action needs typed before it can happen, or null when it needs nothing.
 *
 * One function so the rule lives in one place. Confirming a clinic visit and marking a
 * consultation done are the two that need nothing: the first says yes to a time already
 * agreed, and the second records something that has already happened.
 */
function asks(booking: Appointment, action: Action): Ask | null {
  if (action === 'confirm' && booking.kind === 'virtual') {
    return {
      booking,
      action,
      label: 'Where does the call happen?',
      placeholder: 'https://meet.example.com/your-room',
    };
  }

  if (action === 'decline') {
    return {
      booking,
      action,
      label: 'Why can you not take it?',
      placeholder: 'I am on leave that whole week, sorry.',
    };
  }

  if (action === 'cancel') {
    return {
      booking,
      action,
      label: 'Why are you cancelling?',
      placeholder: 'An emergency surgery has run into that slot.',
    };
  }

  return null;
}

/**
 * The diary from the other side: everything booked with this vet, and the answers owed.
 *
 * Reads the real bookings now. The panel that rendered sample rows is gone, along with
 * the local state that pretended to move them — a status here is the server's, and a
 * screen that could disagree with it about whether a slot is held was the one thing this
 * page could get wrong.
 *
 * A request holds its slot while it waits, which is why "Waiting on you" is the figure
 * given prominence: every one of those is a time nobody else can book.
 */
export default function ProfessionalAppointmentsPage() {
  useDocumentTitle('Appointments', 'Client bookings and consultation requests.');

  const { bookingNotificationMinutes } = useConsoleApplication();

  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [ask, setAsk] = useState<Ask | null>(null);
  const [text, setText] = useState('');

  const list = useIncomingAppointments(filter === 'all' ? {} : { status: filter });
  const decide = useDecideAppointment();
  const cancel = useCancelAppointment();

  const busy = decide.isPending || cancel.isPending;
  const failed = decide.error ?? cancel.error;

  function run(booking: Appointment, action: Action, typed: string): void {
    const done = () => {
      setAsk(null);
      setText('');
    };

    if (action === 'cancel') {
      cancel.mutate({ id: booking.id, reason: typed }, { onSuccess: done });
      return;
    }

    decide.mutate(
      {
        id: booking.id,
        decision: action,
        ...(action === 'decline' ? { reason: typed } : {}),
        ...(action === 'confirm' && typed ? { meetingUrl: typed } : {}),
      },
      { onSuccess: done }
    );
  }

  function act(booking: Appointment, action: Action): void {
    decide.reset();
    cancel.reset();

    const needed = asks(booking, action);
    if (needed) {
      setAsk(needed);
      setText('');
      return;
    }

    run(booking, action, '');
  }

  const bookings = list.data?.items ?? [];
  const counted = (status: AppointmentStatus) =>
    bookings.filter((booking) => booking.status === status).length;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Confirmed" value={counted('confirmed')} />
        <Metric label="Waiting on you" value={counted('requested')} valueClass="text-amber-600" />
        <Metric
          label="Reminder lead time"
          value={
            <span className="flex items-center gap-1 text-base font-bold text-teal-800">
              <Bell className="h-3.5 w-3.5" /> {bookingNotificationMinutes} min prior
            </span>
          }
        />
      </dl>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
              <CalendarCheck className="h-4 w-4 text-teal-800" />
              Appointments
            </h1>
            <p className="text-xs text-slate-500">
              Every request holds its slot until you answer, so nobody else can take that time.
            </p>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 text-xs">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`whitespace-nowrap rounded px-2.5 py-1 font-bold capitalize transition-colors ${
                  filter === option
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {ask && (
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4">
            <label htmlFor="ask-text" className="text-sm font-bold text-teal-900">
              {ask.label}
            </label>
            <textarea
              id="ask-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              placeholder={ask.placeholder}
              className="mt-2 w-full rounded-lg border border-teal-200 bg-white px-3 py-2 text-sm"
            />
            {failed && (
              <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">
                {failed.message}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => run(ask.booking, ask.action, text)}
                // The floors are the server's: ten characters for a reason, a URL for a
                // link. Held here so the answer is a disabled button rather than a 400.
                disabled={
                  busy || (ask.action === 'confirm' ? !text.trim() : text.trim().length < 10)
                }
                className={`${ACT_PRIMARY} h-9 px-4 disabled:opacity-60`}
              >
                {busy ? 'Sending…' : 'Send it'}
              </button>
              <button
                type="button"
                onClick={() => setAsk(null)}
                className={`${ACT_QUIET} h-9 px-4`}
              >
                Never mind
              </button>
            </div>
          </div>
        )}

        {!ask && failed && (
          <p
            role="alert"
            className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
          >
            {failed.message}
          </p>
        )}

        {list.isPending && <p className="py-8 text-center text-xs text-slate-400">Loading…</p>}

        {list.isError && (
          <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <p>Your appointments would not load.</p>
            <button
              type="button"
              onClick={() => void list.refetch()}
              className="mt-1 font-bold underline"
            >
              Try again
            </button>
          </div>
        )}

        {!list.isPending && bookings.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {filter === 'all'
              ? 'Nothing booked with you yet.'
              : 'No appointments under this filter.'}
          </p>
        ) : (
          <ul className={`space-y-3 ${list.isFetching ? 'opacity-60' : ''}`}>
            {bookings.map((booking) => (
              <Row key={booking.id} booking={booking} minutes={booking.minutes} onAct={act} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
