import type { PublicProfessional } from '@/services/professionals.service';
import { Search } from 'lucide-react';

import AllVetsList from './all-vets-list';
import DialogShell, { DIALOG_SECONDARY } from '../../professionals/_components/dialog-shell';
import { FIELD } from './styles';
import { useAllVets } from './use-all-vets';

type Props = {
  open: boolean;
  chosenId: string | null;
  onCancel: () => void;
  onPick: (vet: PublicProfessional) => void;
};

const PAGE_BTN =
  'rounded-lg border border-[#0a0c14]/15 bg-white px-3 py-2 text-sm font-bold text-[#0a0c14] hover:bg-[#0a0c14]/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white';

// Every bookable vet, A-Z, searchable across the whole directory and paged 20 at a time.
export default function AllVetsDialog({ open, chosenId, onCancel, onPick }: Props) {
  const { term, setTerm, page, setPage, query } = useAllVets(open);
  const pages = query.data?.pages ?? 1;

  // Picking here is the same choice as picking from the shortlist, and it closes the popup.
  function pick(vet: PublicProfessional): void {
    onPick(vet);
    onCancel();
  }

  return (
    <DialogShell
      open={open}
      eyebrow="Vetify's vets"
      title="All vet professionals"
      lead="Search by name or clinic, or browse the full list A to Z."
      onCancel={onCancel}
      footer={
        <div className="flex items-center justify-between gap-4">
          {pages > 1 ? (
            <nav aria-label="Vet pages" className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className={PAGE_BTN}
              >
                Previous
              </button>
              <p aria-live="polite" className="text-sm font-semibold text-slate-600">
                Page {page} of {pages}
              </p>
              <button
                type="button"
                onClick={() => setPage(page + 1)}
                disabled={page >= pages}
                className={PAGE_BTN}
              >
                Next
              </button>
            </nav>
          ) : (
            <span />
          )}
          <button type="button" onClick={onCancel} className={DIALOG_SECONDARY}>
            Close
          </button>
        </div>
      }
    >
      <div className="shrink-0 px-6 pt-4 sm:px-8">
        <label className="relative block">
          <span className="sr-only">Search vets by name or clinic</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by name or clinic"
            className={`${FIELD} pl-9`}
          />
        </label>
      </div>

      <AllVetsList
        query={query}
        chosenId={chosenId}
        searched={term.trim().length > 0}
        onPick={pick}
      />
    </DialogShell>
  );
}
