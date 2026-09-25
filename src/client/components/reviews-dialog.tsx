import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useProfessionalReviews } from '@/hooks/useProfessionals';
import { X } from 'lucide-react';
import { useState } from 'react';

import ReviewList from './review-list';

// The card's "who rated this vet" popup: every rater, newest first, names masked, comments shown when left. Mirrors the rate popup's chrome.
export default function ReviewsDialog({
  professionalId,
  name,
  onClose,
}: {
  professionalId: string;
  name: string;
  onClose: () => void;
}) {
  useBodyScrollLock();
  const dialogRef = useFocusTrap<HTMLElement>(onClose);
  const [page, setPage] = useState(1);
  const query = useProfessionalReviews(professionalId, { page });

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Reviews for ${name}`}
        tabIndex={-1}
        className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <h2 className="mb-4 pr-8 text-lg font-black tracking-tight text-slate-950">
          What owners said
        </h2>
        <ReviewList
          page={query.data}
          onPageChange={setPage}
          isLoading={query.isPending}
          emptyLabel="No reviews yet."
        />
      </section>
    </div>
  );
}
