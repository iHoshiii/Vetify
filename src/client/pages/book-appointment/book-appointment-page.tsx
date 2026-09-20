import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useState } from 'react';

import BookingForm from './_components/booking-form';
import BookingHeader from './_components/booking-header';
import { AskedNotice, TakenNotice } from './_components/booking-notices';
import { messageOf } from './_components/error-note';
import KindStep from './_components/kind-step';
import MyBookings from './_components/my-bookings';
import SlotPicker from './_components/slot-picker';
import Step from './_components/step';
import { useBooking } from './_components/use-booking';
import VetStep from './_components/vet-step';

/**
 * Booking a vet as four tabs rather than one long page: each answer decides the next
 * question, and going back to change one should not mean scrolling past the others.
 */
export default function BookAppointmentPage() {
  useDocumentTitle('Book an appointment', 'Find a verified vet and ask for a time that suits.');

  const flow = useBooking();
  const { at, chosen, kind, list, request, slot } = flow;
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <BookingHeader
          appointmentsOpen={appointmentsOpen}
          onAppointmentsToggle={() => setAppointmentsOpen((open) => !open)}
        />

        {appointmentsOpen && <MyBookings onClose={() => setAppointmentsOpen(false)} />}

        {request.isSuccess && <AskedNotice mail={request.data.mail} />}
        {flow.taken && <TakenNotice />}

        {at === 1 && (
          <Step number={1} title="What kind of appointment?">
            <KindStep value={kind} onPick={flow.chooseKind} />
          </Step>
        )}

        {at > 1 && (
          <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm sm:p-8">
            <div className="animate-slideLeft relative w-full max-w-3xl rounded-2xl bg-[#f6fbfb] p-5 shadow-2xl sm:p-8">
              <button
                type="button"
                onClick={() => flow.setStage(1)}
                className="absolute right-4 top-4 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              >
                Close
              </button>
              {at === 2 && kind && (
                <Step number={2} title="Who would you like to see?">
                  <VetStep
                    kind={kind}
                    place={flow.place}
                    filters={flow.filters}
                    onFilters={flow.setFilters}
                    vets={flow.vets}
                    isPending={list.isPending}
                    isFetching={list.isFetching}
                    error={list.isError ? list.error : null}
                    onRetry={() => void list.refetch()}
                    chosenId={chosen?.id ?? null}
                    onPick={flow.pick}
                  />
                </Step>
              )}

              {at === 3 && chosen && (
                <Step number={3} title={`When suits you with ${chosen.name ?? 'them'}?`}>
                  <SlotPicker professionalId={chosen.id} value={slot} onPick={flow.pickSlot} />
                </Step>
              )}

              {at === 4 && chosen && slot && (
                <Step number={4} title="Tell them about the visit">
                  <BookingForm
                    isPending={request.isPending}
                    // The 409 has its own banner above, so it is not repeated in the form.
                    error={request.isError && !flow.taken ? messageOf(request.error) : null}
                    onSubmit={flow.submit}
                  />
                </Step>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
