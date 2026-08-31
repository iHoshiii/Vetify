import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { AppointmentKind } from '@shared/schemas';

import BookingForm from './_components/booking-form';
import BookingIntro from './_components/booking-intro';
import { AskedNotice, TakenNotice } from './_components/booking-notices';
import { messageOf } from './_components/error-note';
import KindStep from './_components/kind-step';
import MyBookings from './_components/my-bookings';
import SlotPicker from './_components/slot-picker';
import { timeOf } from './_components/slot-time';
import Step from './_components/step';
import StepTabs from './_components/step-tabs';
import { useBooking } from './_components/use-booking';
import VetStep from './_components/vet-step';

/** What each kind is called on the tab that remembers the answer. */
const KIND_LABEL: Record<AppointmentKind, string> = {
  onsite: 'Clinic visit',
  virtual: 'Online consultation',
};

/**
 * Booking a vet as four tabs rather than one long page: each answer decides the next
 * question, and going back to change one should not mean scrolling past the others.
 */
export default function BookAppointmentPage() {
  useDocumentTitle('Book an appointment', 'Find a verified vet and ask for a time that suits.');

  const flow = useBooking();
  const { at, chosen, kind, list, request, slot } = flow;

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <BookingIntro />

        {request.isSuccess && <AskedNotice mail={request.data.mail} />}
        {flow.taken && <TakenNotice />}

        <StepTabs
          stage={at}
          reached={flow.reached}
          answers={{
            1: kind ? KIND_LABEL[kind] : null,
            2: chosen?.name ?? chosen?.clinicName ?? null,
            3: slot ? timeOf(slot) : null,
            4: null,
          }}
          onGo={flow.setStage}
        />

        {at === 1 && (
          <Step number={1} title="What kind of appointment?">
            <KindStep value={kind} onPick={flow.chooseKind} />
          </Step>
        )}

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

        <MyBookings />
      </div>
    </main>
  );
}
