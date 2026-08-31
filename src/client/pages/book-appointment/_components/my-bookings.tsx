import { useCancelAppointment, useMyAppointments } from '@/hooks/useAppointments';
import { useState } from 'react';

import BookingRow from './booking-row';
import CancelPanel from './cancel-panel';

/**
 * What the caller has asked for, under the flow that asks — because "did that go
 * through" is a question asked on this screen rather than later somewhere else.
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
          <BookingRow key={booking.id} booking={booking} onCancel={setCancelling} />
        ))}
      </ul>

      {cancelling && (
        <CancelPanel
          reason={reason}
          onReason={setReason}
          onConfirm={confirmCancel}
          onKeep={() => setCancelling(null)}
          isPending={cancel.isPending}
          error={cancel.isError ? cancel.error.message : null}
        />
      )}
    </section>
  );
}
