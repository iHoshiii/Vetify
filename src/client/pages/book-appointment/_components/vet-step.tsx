import type { useMyLocation } from '@/hooks/use-my-location';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { Map } from 'lucide-react';
import { Link } from 'react-router-dom';

import ErrorNote, { messageOf } from './error-note';
import MismatchNote from './mismatch-note';
import NearestVets from './nearest-vets';
import { onlyOffersLabel } from './service-offer';
import VetCard from './vet-card';
import VetFilters, { type VetFilters as Filters } from './vet-filters';

/** Step two: search first, then the location shortlist, then directory results. */
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
  mismatched,
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
  mismatched: PublicProfessional | null;
  onPick: (vet: PublicProfessional) => void;
}) {
  if (mismatched) {
    return <MismatchNote vet={mismatched} offers={onlyOffersLabel(mismatched)} />;
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <VetFilters value={filters} onChange={onFilters} />
        <Link
          to="/map"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-900/15 bg-white px-3 text-xs font-bold text-slate-900 transition hover:border-slate-900/30"
        >
          <Map className="h-3.5 w-3.5 text-teal-700" aria-hidden />
          View map
        </Link>
      </div>
      <div className="mt-4">
        <NearestVets kind={kind} place={place} chosenId={chosenId} onPick={onPick} />
      </div>
      {isPending && <p className="mt-4 text-sm text-slate-600">Finding vets…</p>}
      {error != null && <ErrorNote className="mt-4" message={messageOf(error)} onRetry={onRetry} />}
      <ul className={`mt-4 grid gap-3 ${isFetching ? 'opacity-60' : ''}`}>
        {vets.map((vet) => (
          <VetCard key={vet.id} vet={vet} onPick={onPick} picked={chosenId === vet.id} />
        ))}
      </ul>
    </>
  );
}
