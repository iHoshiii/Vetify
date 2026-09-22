import { useProfessional } from '@/hooks/useProfessionals';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import type { BookingDetails } from './booking-form';
import type { Run } from './slot-span';
import type { Stage } from './step-tabs';
import { PartialRequestError, useBatchRequest } from './use-batch-request';

/** The whole flow: what has been answered, which tab that opens, and what to ask next. */
export function useBooking() {
  // The profile page and the map both link back here with a vet already chosen.
  const [params] = useSearchParams();

  const [stage, setStage] = useState<Stage>(1);
  const [vet, setVet] = useState<PublicProfessional | null>(null);
  const [kind, setKind] = useState<AppointmentKind | null>(null);
  // The hours picked, split into runs. Each run books as its own appointment.
  const [runs, setRuns] = useState<Run[]>([]);
  const [taken, setTaken] = useState<string | null>(null);
  // The filled form held back for the confirm step, so nothing is sent until it is agreed.
  const [pending, setPending] = useState<BookingDetails | null>(null);

  const request = useBatchRequest();

  const preselect = useProfessional(params.get('professional') ?? undefined);
  const chosen = vet ?? preselect.data ?? null;

  const reached: Stage = !chosen ? 1 : !kind ? 2 : runs.length === 0 ? 3 : 4;
  const at = (stage < reached ? stage : reached) as Stage;

  function pick(next: PublicProfessional): void {
    setVet(next);
    // The old service and hours belonged to a different vet's diary.
    setKind(null);
    setRuns([]);
    setTaken(null);
    setPending(null);
    request.reset();
    setStage(2);
  }

  function chooseKind(next: AppointmentKind): void {
    setKind(next);
    setStage(3);
  }

  function chooseRuns(next: Run[]): void {
    setRuns(next);
    setStage(4);
  }

  /** Back to the grid: the hours are now held, or one went to somebody faster. */
  function landOnRuns(held: string | null): void {
    setTaken(held);
    setRuns([]);
    setPending(null);
    setStage(3);
  }

  // A sent request closes the whole flow back to step one, where the toast is read.
  function finish(): void {
    setKind(null);
    setRuns([]);
    setPending(null);
    setTaken(null);
    setStage(1);
  }

  /** The form is filled; hold it and show the confirm dialog rather than sending. */
  function submit(details: BookingDetails): void {
    if (!chosen || !kind || runs.length === 0) return;
    setPending(details);
  }

  function confirm(): void {
    if (!chosen || !kind || !pending || runs.length === 0) return;

    setTaken(null);
    request.mutate(
      runs.map((run) => ({
        professionalId: chosen.id,
        kind,
        startsAt: run.startsAt,
        slots: run.slots,
        petSpecies: pending.petSpecies,
        reason: pending.reason,
        phone: pending.phone,
        ...(pending.petName ? { petName: pending.petName } : {}),
        ...(pending.petBreed ? { petBreed: pending.petBreed } : {}),
        ...(pending.petAge ? { petAge: pending.petAge } : {}),
        ...(pending.clientEmail ? { clientEmail: pending.clientEmail } : {}),
      })),
      {
        onSuccess: finish,
        // A partial 409 names the slot that went, so the refreshed grid lands on it.
        onError: (error) => {
          if (error instanceof PartialRequestError) landOnRuns(error.takenAt);
        },
      }
    );
  }

  return {
    at,
    reached,
    kind,
    chosen,
    runs,
    taken,
    pending,
    request,
    setStage,
    pick,
    chooseKind,
    chooseRuns,
    submit,
    confirm,
    cancelConfirm: () => setPending(null),
  };
}
