import type { useMyLocation } from '@/hooks/use-my-location';
import type { PublicProfessional } from '@/services/professionals.service';
import type { AppointmentKind } from '@shared/schemas';
import { Crosshair, Loader2 } from 'lucide-react';

import { away } from './distance';
import ErrorNote, { messageOf } from './error-note';
import NearestNote from './nearest-note';
import { radiusFor, useNearestVets } from './nearest-query';
import VetCard from './vet-card';

/** What the shortlist is, in the words of the kind chosen in step one. */
const TITLE: Record<AppointmentKind, string> = {
  onsite: 'Nearest clinics to you',
  virtual: 'Most experienced vets near you',
};

const ASK =
  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-teal-800 px-3 text-xs font-bold text-white transition hover:bg-teal-900 disabled:opacity-60';

/**
 * The shortlist above the directory: five vets picked by where somebody is standing.
 *
 * The location comes in as a prop rather than being read here, so switching the visit
 * type on tab one does not unmount the answer to a permission prompt.
 */
export default function NearestVets({
  kind,
  place,
  chosenId,
  onPick,
}: {
  kind: AppointmentKind;
  place: ReturnType<typeof useMyLocation>;
  chosenId: string | null;
  onPick: (vet: PublicProfessional) => void;
}) {
  const { status, location, ask } = place;
  const { items, isPending, error } = useNearestVets(kind, location);

  const busy = status === 'asking' || isPending;

  return (
    <div className="rounded-xl border border-slate-900/10 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
          {TITLE[kind]}
        </h3>

        {status !== 'unsupported' && (
          <button type="button" onClick={ask} disabled={busy} className={ASK}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Crosshair className="h-3.5 w-3.5" aria-hidden />
            )}
            {status === 'ready' ? 'Update' : busy ? 'Locating…' : 'Use my location'}
          </button>
        )}
      </div>

      <NearestNote
        status={status}
        kind={kind}
        isPending={isPending}
        count={items.length}
        radiusKm={radiusFor(kind)}
      />

      {error != null && <ErrorNote message={messageOf(error)} onRetry={ask} />}

      {items.length > 0 && (
        <ul aria-label="Nearest vets to you" className="mt-3 grid gap-3">
          {items.map((vet) => (
            <VetCard
              key={vet.id}
              vet={vet}
              away={away(vet.distanceMeters)}
              onPick={onPick}
              picked={chosenId === vet.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
