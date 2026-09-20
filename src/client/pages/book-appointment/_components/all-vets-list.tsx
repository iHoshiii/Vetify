import type { ProfessionalPage, PublicProfessional } from '@/services/professionals.service';
import type { UseQueryResult } from '@tanstack/react-query';

import ErrorNote, { messageOf } from './error-note';
import VetCard from './vet-card';

const NOTE = 'px-6 py-8 text-center text-sm text-slate-600 sm:px-8';

type Props = {
  query: UseQueryResult<ProfessionalPage>;
  chosenId: string | null;
  searched: boolean;
  onPick: (vet: PublicProfessional) => void;
};

// The scrolling middle of the dialog: one state at a time, cards when there are any.
export default function AllVetsList({ query, chosenId, searched, onPick }: Props) {
  const { data, isPending, error, refetch } = query;
  const items = data?.items ?? [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 sm:px-8">
      {isPending && <p className={NOTE}>Loading vets…</p>}

      {error != null && (
        <div className="py-4">
          <ErrorNote message={messageOf(error)} onRetry={refetch} />
        </div>
      )}

      {!isPending && error == null && items.length === 0 && (
        <p className={NOTE}>{searched ? 'No vet matches that search.' : 'No bookable vets yet.'}</p>
      )}

      {items.length > 0 && (
        <ul aria-label="All bookable vets" className="grid gap-3">
          {items.map((vet) => (
            <VetCard key={vet.id} vet={vet} onPick={onPick} picked={chosenId === vet.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
