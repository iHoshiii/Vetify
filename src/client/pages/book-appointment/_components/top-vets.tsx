import { useProfessionals } from '@/hooks/useProfessionals';
import type { PublicProfessional } from '@/services/professionals.service';
import { List, Map } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import AllVetsDialog from './all-vets-dialog';
import ErrorNote, { messageOf } from './error-note';
import VetCard from './vet-card';

const NOTE = 'mt-3 text-sm leading-6 text-slate-500';
const CHIP =
  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50';

// The best-reviewed vets, ranked server-side; the map covers everyone the shortlist leaves out.
export default function TopVets({
  chosenId,
  onPick,
}: {
  chosenId: string | null;
  onPick: (vet: PublicProfessional) => void;
}) {
  const { data, isPending, error, refetch } = useProfessionals({
    available: true,
    sort: 'rating',
    limit: 5,
  });
  const items = data?.items ?? [];
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Top-reviewed vets
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAllOpen(true)} className={CHIP}>
            <List className="h-3.5 w-3.5 text-teal-700" aria-hidden />
            All vets
          </button>
          <Link to="/map" className={CHIP}>
            <Map className="h-3.5 w-3.5 text-teal-700" aria-hidden />
            Map
          </Link>
        </div>
      </div>

      {/* Mounted only while open, so the full directory is fetched on demand, not on load. */}
      {allOpen && (
        <AllVetsDialog
          open
          chosenId={chosenId}
          onCancel={() => setAllOpen(false)}
          onPick={onPick}
        />
      )}

      {isPending && <p className={NOTE}>Finding the best-reviewed vets…</p>}

      {error != null && <ErrorNote message={messageOf(error)} onRetry={refetch} />}

      {!isPending && error == null && items.length === 0 && (
        <p className={NOTE}>No reviewed vets yet. Open the map to find one near you.</p>
      )}

      {items.length > 0 && (
        <ul aria-label="Top-reviewed vets" className="mt-3 grid gap-3">
          {items.map((vet) => (
            <VetCard key={vet.id} vet={vet} onPick={onPick} picked={chosenId === vet.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
