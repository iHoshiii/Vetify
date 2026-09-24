import { useCancelAppointment, useMyAppointments } from '@/hooks/useAppointments';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { X } from 'lucide-react';
import { useState } from 'react';

import BookingFilterBar, { FILTER_STATUSES, type BookingFilter } from './booking-filter';
import BookingRow from './booking-row';
import CancelPanel from './cancel-panel';
import Pager from './pager';

// The caller's own requests, in the flow that files them, so "did that go through" is answered here.
export default function MyBookings({ onClose }: { onClose: () => void }) {
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [page, setPage] = useState(1);

  // This modal only mounts while open, so hold the page still for its whole life.
  useBodyScrollLock();

  const list = useMyAppointments({ page, status: FILTER_STATUSES[filter] });
  const cancel = useCancelAppointment();

  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  // Changing the filter starts the set over, so page 3 of one filter never lands you past the end of another.
  function pick(next: BookingFilter): void {
    setFilter(next);
    setPage(1);
  }

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
  const pages = list.data?.pages ?? 1;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-slate-900/50 p-4"
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
        className="flex h-[630px] max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id="appointments-title" className="text-base font-semibold text-slate-900">
            Your appointments
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appointments"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-200 px-5 py-3">
          <BookingFilterBar value={filter} onPick={pick} />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {list.isPending && <p className="text-sm text-slate-500">Loading…</p>}

          {!list.isPending && bookings.length === 0 && (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No appointments to show.
            </p>
          )}

          <ul className="space-y-3" aria-label="Appointments">
            {bookings.map((booking) => (
              <BookingRow key={booking.id} booking={booking} onCancel={setCancelling} />
            ))}
          </ul>
        </div>

        {pages > 1 && (
          <div className="shrink-0 border-t border-slate-200 px-5 py-3">
            <Pager
              page={list.data?.page ?? page}
              pages={pages}
              total={list.data?.total ?? bookings.length}
              onPage={setPage}
            />
          </div>
        )}

        {cancelling && (
          <div className="shrink-0 border-t border-slate-200 px-5 pb-4">
            <CancelPanel
              reason={reason}
              onReason={setReason}
              onConfirm={confirmCancel}
              onKeep={() => setCancelling(null)}
              isPending={cancel.isPending}
              error={cancel.isError ? cancel.error.message : null}
            />
          </div>
        )}
      </section>
    </div>
  );
}
