import type { ProfessionalReviewPage } from '@/services/professionals.service';
import { Star } from 'lucide-react';

// Five stars with the first `value` filled, for one review's whole-number score.
function Stars({ value }: { value: number }) {
  return (
    <span className="mt-1 inline-flex" aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < value ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

// Formats an ISO instant as a plain calendar date.
function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const PAGER =
  'rounded-md px-3 py-1.5 font-semibold text-teal-800 transition hover:bg-teal-50 disabled:text-slate-300 disabled:hover:bg-transparent';

// The shared body of the card popup and the profile Ratings panel: a page of masked reviews and a pager. The parent owns the page number and the fetch, so this stays presentational.
export default function ReviewList({
  page,
  onPageChange,
  isLoading,
  emptyLabel,
}: {
  page?: ProfessionalReviewPage;
  onPageChange: (next: number) => void;
  isLoading: boolean;
  emptyLabel: string;
}) {
  if (!page) return <p className="text-sm text-slate-500">{isLoading ? 'Loading…' : emptyLabel}</p>;
  if (page.items.length === 0) return <p className="text-sm text-slate-500">{emptyLabel}</p>;

  return (
    <div>
      <ul className="grid gap-4">
        {page.items.map((review) => (
          <li key={review.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-slate-900">{review.reviewer}</span>
              <span className="text-xs text-slate-500">{when(review.ratedAt)}</span>
            </div>
            <Stars value={review.stars} />
            {review.comment && (
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                {review.comment}
              </p>
            )}
          </li>
        ))}
      </ul>
      {page.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page.page <= 1}
            onClick={() => onPageChange(page.page - 1)}
            className={PAGER}
          >
            Newer
          </button>
          <span className="text-slate-500">
            Page {page.page} of {page.pages}
          </span>
          <button
            type="button"
            disabled={page.page >= page.pages}
            onClick={() => onPageChange(page.page + 1)}
            className={PAGER}
          >
            Older
          </button>
        </div>
      )}
    </div>
  );
}
