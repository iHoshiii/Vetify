import {
  useCancelAppointment,
  useDecideAppointment,
  useIncomingAppointmentCounts,
  useIncomingAppointments,
} from '@/hooks/useAppointments';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Appointment } from '@/services/appointments.service';
import type { AppointmentKind } from '@shared/schemas';
import { useState } from 'react';

import { ApiError } from '@/services/api';
import { useSearchParams } from 'react-router-dom';

import { asks, type Action, type Ask } from './_components/booking-actions';
import BookingAskBox from './_components/booking-ask-box';
import BookingHeader, { BOOKING_COPY } from './_components/booking-header';
import BookingRow from './_components/booking-row';
import { BOOKING_TABS, type BookingTab } from './_components/booking-tabs';
import { useConsoleApplication } from './professional-layout';

// The first field message a 400 carries, so the vet reads "That is not a link" not "Invalid request payload."
function reasonOf(error: Error | null): string | undefined {
  if (error instanceof ApiError && error.issues) {
    const first = Object.values(error.issues).find((list) => list?.length)?.[0];
    if (first) return first;
  }
  return error?.message;
}

// One page for both kinds: the same rows and the same answers, filtered to the one the console section is about
export default function ProfessionalBookingsPage({ kind }: { kind: AppointmentKind }) {
  const copy = BOOKING_COPY[kind];
  useDocumentTitle(copy.title, copy.blurb);

  const { bookingNotificationMinutes } = useConsoleApplication();

  const [params, setParams] = useSearchParams();
  // the active tab lives in the URL so a reminder can deep-link to Scheduled and each queue keeps its own tab
  const tab = BOOKING_TABS.find((t) => t.key === params.get('tab')) ?? BOOKING_TABS[0];
  const pickTab = (next: BookingTab) =>
    setParams(next.key === BOOKING_TABS[0].key ? {} : { tab: next.key }, { replace: true });
  const [ask, setAsk] = useState<Ask | null>(null);
  const [text, setText] = useState('');

  const counts = useIncomingAppointmentCounts();
  const list = useIncomingAppointments({ kind, status: tab.statuses });
  const decide = useDecideAppointment();
  const cancel = useCancelAppointment();

  const busy = decide.isPending || cancel.isPending;
  const failed = reasonOf(decide.error ?? cancel.error);
  const bookings = list.data?.items ?? [];

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

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <BookingHeader
        kind={kind}
        minutes={bookingNotificationMinutes}
        tab={tab}
        counts={counts.data?.[kind]}
        onPick={pickTab}
      />

      {ask && (
        <BookingAskBox
          ask={ask}
          text={text}
          onText={setText}
          error={failed}
          busy={busy}
          onSend={() => run(ask.booking, ask.action, text)}
          onDrop={() => setAsk(null)}
        />
      )}

      {!ask && failed && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
        >
          {failed}
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
          Nothing under {tab.label.toLowerCase()} here yet.
        </p>
      ) : (
        <ul className={`space-y-3 ${list.isFetching ? 'opacity-60' : ''}`}>
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} minutes={booking.minutes} onAct={act} />
          ))}
        </ul>
      )}
    </div>
  );
}
