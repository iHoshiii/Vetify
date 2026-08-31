import { useRequestAppointment } from '@/hooks/useAppointments';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import BookingForm, { type BookingDetails } from './_components/booking-form';
import BookingIntro from './_components/booking-intro';
import { AskedNotice, TakenNotice } from './_components/booking-notices';
import { messageOf } from './_components/error-note';
import KindStep from './_components/kind-step';
import MyBookings from './_components/my-bookings';
import SlotPicker from './_components/slot-picker';
import Step from './_components/step';
import { NO_FILTERS, type VetFilters as Filters } from './_components/vet-filters';
import VetStep from './_components/vet-step';

/**
 * Booking a vet, in four steps down one page: every answer changes what the next step
 * shows, and swapping the vet after seeing the times should not mean going backwards.
 */
export default function BookAppointmentPage() {
  useDocumentTitle('Book an appointment', 'Find a verified vet and ask for a time that suits.');

  // The profile page links back here with a vet already chosen.
  const [params] = useSearchParams();

  const [kind, setKind] = useState<AppointmentKind | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [vet, setVet] = useState<PublicProfessional | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  const wanted = params.get('professional');

  // `available: true` never comes off: a listing nobody can book is not a choice.
  const list = useProfessionals({
    available: true,
    limit: 24,
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.specialty ? { specialty: filters.specialty } : {}),
    ...(filters.minExperience ? { minExperience: Number(filters.minExperience) } : {}),
    ...(filters.maxRate ? { maxRate: Number(filters.maxRate) } : {}),
  });

  const request = useRequestAppointment();

  const vets = list.data?.items ?? [];
  // A vet named in the URL is chosen for them, so arriving from a profile skips a step.
  const chosen = vet ?? vets.find((item) => item.id === wanted) ?? null;

  function pick(next: PublicProfessional): void {
    setVet(next);
    // The old slot belonged to somebody else's diary.
    setSlot(null);
    setTaken(null);
    request.reset();
  }

  function submit(details: BookingDetails): void {
    if (!chosen || !kind || !slot) return;

    setTaken(null);
    request.mutate(
      {
        professionalId: chosen.id,
        kind,
        startsAt: slot,
        petName: details.petName,
        petSpecies: details.petSpecies,
        reason: details.reason,
        ...(details.phone ? { phone: details.phone } : {}),
      },
      {
        onSuccess: () => setSlot(null),
        // A 409 is a race: name the slot that went and let the refreshed grid decide.
        onError: (error) => {
          if (error instanceof ApiError && error.reason === 'slot-taken') {
            setTaken(slot);
            setSlot(null);
          }
        },
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <BookingIntro />

        {request.isSuccess && <AskedNotice mail={request.data.mail} />}
        {taken && <TakenNotice />}

        <Step number={1} title="What kind of appointment?">
          <KindStep value={kind} onPick={setKind} />
        </Step>

        {kind && (
          <Step number={2} title="Who would you like to see?">
            <VetStep
              filters={filters}
              onFilters={setFilters}
              vets={vets}
              isPending={list.isPending}
              isFetching={list.isFetching}
              error={list.isError ? list.error : null}
              onRetry={() => void list.refetch()}
              chosenId={chosen?.id ?? null}
              onPick={pick}
            />
          </Step>
        )}

        {kind && chosen && (
          <Step number={3} title={`When suits you with ${chosen.name ?? 'them'}?`}>
            <SlotPicker professionalId={chosen.id} value={slot} onPick={setSlot} />
          </Step>
        )}

        {kind && chosen && slot && (
          <Step number={4} title="Tell them about the visit">
            <BookingForm
              isPending={request.isPending}
              // The 409 has its own banner above, so it is not repeated in the form.
              error={request.isError && !taken ? messageOf(request.error) : null}
              onSubmit={submit}
            />
          </Step>
        )}

        <MyBookings />
      </div>
    </main>
  );
}
