import { useRequestAppointment } from '@/hooks/useAppointments';
import { useProfessional } from '@/hooks/useProfessionals';
import { ApiError } from '@/services/api';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { BookingDetails } from './booking-form';
import type { Stage } from './step-tabs';

/** The whole flow: what has been answered, which tab that opens, and what to ask next. */
export function useBooking() {
  // The profile page and the map both link back here with a vet already chosen.
  const [params] = useSearchParams();

  const [stage, setStage] = useState<Stage>(1);
  const [vet, setVet] = useState<PublicProfessional | null>(null);
  const [kind, setKind] = useState<AppointmentKind | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [taken, setTaken] = useState<string | null>(null);

  const request = useRequestAppointment();

  // A vet named in the URL is read on its own, so arriving from a profile or the map
  // skips the shortlist and lands on the service question.
  const preselect = useProfessional(params.get('professional') ?? undefined);
  const chosen = vet ?? preselect.data ?? null;

  // The furthest tab the answers unlock, and the one actually open. The vet comes first:
  // the service on offer is a fact about them, so it cannot be asked before they are.
  const reached: Stage = !chosen ? 1 : !kind ? 2 : !slot ? 3 : 4;
  const at = (stage < reached ? stage : reached) as Stage;

  function pick(next: PublicProfessional): void {
    setVet(next);
    // The old service and slot belonged to a different vet's diary.
    setKind(null);
    setSlot(null);
    setTaken(null);
    request.reset();
    setStage(2);
  }

  function chooseKind(next: AppointmentKind): void {
    setKind(next);
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
        petSpecies: details.petSpecies,
        reason: details.reason,
        ...(details.petName ? { petName: details.petName } : {}),
        ...(details.petBreed ? { petBreed: details.petBreed } : {}),
        ...(details.petAge ? { petAge: details.petAge } : {}),
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
    chosen,
    slot,
    taken,
    request,
    setStage,
    pick,
    chooseKind,
    pickSlot,
    submit,
  };
}
