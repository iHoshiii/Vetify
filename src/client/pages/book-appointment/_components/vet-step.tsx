import type { useMyLocation } from '@/hooks/use-my-location';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';

import ErrorNote, { messageOf } from './error-note';
import NearestVets from './nearest-vets';
import VetCard from './vet-card';
import VetFilters, { type VetFilters as Filters } from './vet-filters';

/** Step two: search first, then the shortlist for where somebody is, then everyone. */
export default function VetStep({
  kind,
  place,
  filters,
  onFilters,
  vets,
  isPending,
  isFetching,
  error,
  onRetry,
  chosenId,
  onPick,
}: {
  kind: AppointmentKind;
  place: ReturnType<typeof useMyLocation>;
  filters: Filters;
  onFilters: (filters: Filters) => void;
  vets: PublicProfessional[];
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  chosenId: string | null;
  onPick: (vet: PublicProfessional) => void;
}) {
  return (
    <>
      <VetFilters value={filters} onChange={onFilters} />

      <div className="mt-4">
        <NearestVets kind={kind} place={place} chosenId={chosenId} onPick={onPick} />
      </div>

      <p className="mt-6 text-sm font-black uppercase tracking-wider text-slate-500">
        Every vet taking bookings
      </p>

      {isPending && <p className="mt-4 text-sm text-slate-600">Finding vets…</p>}

      {error != null && <ErrorNote className="mt-4" message={messageOf(error)} onRetry={onRetry} />}

      {!isPending && vets.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">
          No vet taking bookings matches that. Try a wider search — or clear the rate and experience
          limits, which are the two that narrow it fastest.
        </p>
      )}

      <ul className={`mt-4 grid gap-3 ${isFetching ? 'opacity-60' : ''}`}>
        {vets.map((vet) => (
          <VetCard key={vet.id} vet={vet} onPick={onPick} picked={chosenId === vet.id} />
        ))}
      </ul>
    </>
  );
}
