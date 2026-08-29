import { useCancelAppointment, useMyAppointments } from '@/hooks/useAppointments';
import type { Appointment } from '@/services/appointments.service';
import type { AppointmentStatus } from '@shared/schemas';
import { useState } from 'react';
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

/**
 * One booking of the caller's, with the way out of it.
 *
 * The reason a vet gave is shown on a decline or a cancellation, because it is the
 * answer to the question the row raises. A meeting link is shown only once confirmed:
 * a link on a booking nobody has agreed to would be a link to nothing.
 */
function Row({ booking, onCancel }: { booking: Appointment; onCancel: (id: string) => void }) {
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

/**
 * What the caller has asked for, under the flow that asks.
 *
 * Here rather than on a page of its own, because a booking somebody cannot see
 * afterwards is not finished — and the question "did that go through" is asked
 * immediately, on this screen, rather than later somewhere else.
 */
export default function MyBookings() {
  const list = useMyAppointments();
  const cancel = useCancelAppointment();

  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  function confirmCancel(): void {
    if (!cancelling) return;

    cancel.mutate(
      { id: cancelling, reason },
      {
        onSuccess: () => {
          setCancelling(null);
          setReason('');
        },
      }
    );
  }

  const bookings = list.data?.items ?? [];

  return (
    <section className="mt-12">
      <h2 className="text-xl font-black tracking-tight text-slate-950">Your appointments</h2>

      {list.isPending && <p className="mt-3 text-sm text-slate-600">Loading…</p>}

      {!list.isPending && bookings.length === 0 && (
        <p className="mt-3 text-sm text-slate-600">
          Nothing booked yet. Anything you ask for will show up here with its answer.
        </p>
      )}

      <ul className="mt-4 grid gap-3">
        {bookings.map((booking) => (
          <Row key={booking.id} booking={booking} onCancel={setCancelling} />
        ))}
      </ul>

      {cancelling && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <label htmlFor="cancel-reason" className="text-sm font-bold text-rose-900">
            Why are you cancelling?
          </label>
          {/* Asked rather than optional: the vet is told, and "something came up" is
              worth more to them than a booking that simply disappears. */}
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm"
            placeholder="Milo is much better, no need for the visit."
          />
          {cancel.isError && (
            <p role="alert" className="mt-2 text-sm font-semibold text-rose-800">
              {cancel.error.message}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmCancel}
              disabled={cancel.isPending || reason.trim().length < 10}
              className="inline-flex h-9 items-center rounded-lg bg-rose-700 px-4 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              {cancel.isPending ? 'Cancelling…' : 'Cancel it'}
            </button>
            <button
              type="button"
              onClick={() => setCancelling(null)}
              className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
