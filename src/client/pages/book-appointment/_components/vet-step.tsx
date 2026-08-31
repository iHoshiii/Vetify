import type { PublicProfessional } from '@/services/professionals.service';

import ErrorNote, { messageOf } from './error-note';
import VetCard from './vet-card';
import VetFilters, { type VetFilters as Filters } from './vet-filters';

/** Step two: narrowing the directory, then choosing somebody out of what is left. */
export default function VetStep({
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
