import { useRequestAppointment } from '@/hooks/useAppointments';
import { useMyLocation } from '@/hooks/use-my-location';
import { useProfessionals } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { BookingDetails } from './booking-form';
import type { Stage } from './step-tabs';
import { NO_FILTERS, type VetFilters as Filters } from './vet-filters';

/** How many directory rows one read of step two holds. */
const PAGE = 24;

/** The whole flow: what has been answered, which tab that opens, and what to ask next. */
export function useBooking() {
  // The profile page links back here with a vet already chosen.
  const [params] = useSearchParams();

  const [stage, setStage] = useState<Stage>(1);
  const [kind, setKind] = useState<AppointmentKind | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [vet, setVet] = useState<PublicProfessional | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  // `available: true` never comes off: a listing nobody can book is not a choice.
  const list = useProfessionals({
    available: true,
    limit: PAGE,
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.minExperience ? { minExperience: Number(filters.minExperience) } : {}),
    ...(filters.maxRate ? { maxRate: Number(filters.maxRate) } : {}),
  });

  const request = useRequestAppointment();

  // Held here rather than in the shortlist, so changing the visit type on tab one does
  // not throw away a location somebody already agreed to share.
  const place = useMyLocation();

  const vets = list.data?.items ?? [];
  // A vet named in the URL is chosen for them, so arriving from a profile skips a step.
  const chosen = vet ?? vets.find((item) => item.id === params.get('professional')) ?? null;

  // The furthest tab the answers unlock, and the one actually open.
  const reached: Stage = !kind ? 1 : !chosen ? 2 : !slot ? 3 : 4;
  const at = (stage < reached ? stage : reached) as Stage;

  function chooseKind(next: AppointmentKind): void {
    setKind(next);
    setStage(2);
  }

  function pick(next: PublicProfessional): void {
    setVet(next);
    // The old slot belonged to somebody else's diary.
    setSlot(null);
    setTaken(null);
    request.reset();
    setStage(3);
  }

  function pickSlot(next: string): void {
    setSlot(next);
    setStage(4);
  }

  /** Back to the grid either way: the slot is now held, or gone to somebody faster. */
  function landOnSlots(held: string | null): void {
    setTaken(held);
    setSlot(null);
    setStage(3);
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
        onSuccess: () => landOnSlots(null),
        // A 409 is a race: name the slot that went and let the refreshed grid decide.
        onError: (error) => {
          if (error instanceof ApiError && error.reason === 'slot-taken') landOnSlots(slot);
        },
      }
    );
  }

  return {
    at,
    reached,
    kind,
    filters,
    chosen,
    slot,
    taken,
    vets,
    list,
    place,
    request,
    setStage,
    setFilters,
    chooseKind,
    pick,
    pickSlot,
    submit,
  };
}
