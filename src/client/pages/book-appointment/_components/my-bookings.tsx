import { useCancelAppointment, useMyAppointments } from '@/hooks/useAppointments';
import { X } from 'lucide-react';
import { useState } from 'react';

import BookingRow from './booking-row';
import CancelPanel from './cancel-panel';

/**
 * What the caller has asked for, under the flow that asks — because "did that go
 * through" is a question asked on this screen rather than later somewhere else.
 */
export default function MyBookings({ onClose }: { onClose: () => void }) {
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
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        id="my-appointments"
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointments-title"
        className="animate-scaleIn w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 id="appointments-title" className="text-xl font-black tracking-tight text-slate-950">
            Your appointments
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appointments"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {list.isPending && <p className="mt-3 text-sm text-slate-600">Loading…</p>}

        {!list.isPending && bookings.length === 0 && (
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-600">
            No appointments
          </p>
        )}

        <ul className="mt-4 grid gap-3" aria-label="Appointments">
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
    </div>
  );
}
