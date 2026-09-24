import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import BookingForm from './_components/booking-form';
import BookingHeader from './_components/booking-header';
import { AskedNotice, TakenNotice } from './_components/booking-notices';
import ConfirmDialog from './_components/confirm-dialog';
import { messageOf } from './_components/error-note';
import KindStep from './_components/kind-step';
import MyBookings from './_components/my-bookings';
import RatePopup from './_components/rate-popup';
import SentToast from './_components/sent-toast';
import SlotPicker from './_components/slot-picker';
import Step from './_components/step';
import TopVets from './_components/top-vets';
import { useBooking } from './_components/use-booking';

/**
 * Booking a vet as four tabs rather than one long page: each answer decides the next
 * question, and going back to change one should not mean scrolling past the others.
 */
export default function BookAppointmentPage() {
  useDocumentTitle('Book an appointment', 'Find a verified vet and ask for a time that suits.');

  const flow = useBooking();
  const { at, chosen, kind, request, runs, pending } = flow;
  const location = useLocation();
  const [appointmentsOpen, setAppointmentsOpen] = useState(false);
  // A finished call routes the owner here with the booking id, so the stars pop outside the call room.
  const [rateId, setRateId] = useState<string | null>(
    (location.state as { rate?: string } | null)?.rate ?? null
  );

  // The step overlay (2 to 4) dims the page behind it, so freeze that page while it shows.
  useBodyScrollLock(at > 1 && Boolean(chosen));

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <BookingHeader
          appointmentsOpen={appointmentsOpen}
          onAppointmentsToggle={() => setAppointmentsOpen((open) => !open)}
        />

        {appointmentsOpen && <MyBookings onClose={() => setAppointmentsOpen(false)} />}

        {rateId && <RatePopup appointmentId={rateId} onClose={() => setRateId(null)} />}

        {request.isSuccess && chosen && (
          <SentToast
            vetName={chosen.name ?? chosen.clinicName ?? 'your vet'}
            onDismiss={request.reset}
          />
        )}
        {request.isSuccess && <AskedNotice mail={request.data.mail} />}
        {flow.taken && <TakenNotice />}

        {at === 1 && (
          <Step number={1} title="Who would you like to see?">
            <TopVets chosenId={chosen?.id ?? null} onPick={flow.pick} />
          </Step>
        )}

        {at > 1 && chosen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm sm:p-8">
            <div className="animate-slideLeft relative w-full max-w-3xl rounded-2xl bg-[#f6fbfb] p-5 shadow-2xl sm:p-8">
              <button
                type="button"
                onClick={() => flow.setStage(1)}
                className="absolute right-4 top-4 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-900"
              >
                Close
              </button>
              {at === 2 && (
                <Step number={2} title="What kind of appointment?">
                  <KindStep vet={chosen} value={kind} onPick={flow.chooseKind} />
                </Step>
              )}

              {at === 3 && kind && (
                <Step number={3} title={`When suits you with ${chosen.name ?? 'them'}?`}>
                  <SlotPicker professionalId={chosen.id} kind={kind} onChoose={flow.chooseRuns} />
                </Step>
              )}

              {at === 4 && runs.length > 0 && (
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

        {chosen && kind && pending && runs.length > 0 && (
          <ConfirmDialog
            open
            vet={chosen}
            kind={kind}
            runs={runs}
            details={pending}
            isPending={request.isPending}
            onConfirm={flow.confirm}
            onCancel={flow.cancelConfirm}
          />
        )}
      </div>
    </main>
  );
}
