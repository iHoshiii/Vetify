import ReviewList from '@/components/review-list';
import { useAuth } from '@/components/providers/AuthProvider';
import { useProfessionalRatingBreakdown, useProfessionalReviews } from '@/hooks/useProfessionals';
import type { ProfessionalReview } from '@/services/professionals.service';
import { useState } from 'react';

import RatingBreakdown from './rating-breakdown';
import ReportReview from './report-review';

// The profile's Ratings panel: the star histogram over a page of written reviews, newest first, names masked. Clicking a bar filters the list to that score.
export default function VetRatings({ professionalId }: { professionalId: string }) {
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [stars, setStars] = useState<number | null>(null);
  const [reporting, setReporting] = useState<ProfessionalReview | null>(null);
  const breakdown = useProfessionalRatingBreakdown(professionalId);
  const query = useProfessionalReviews(professionalId, {
    page,
    comments: true,
    stars: stars ?? undefined,
  });

  // A bar click both filters and rewinds to the first page of that score.
  function select(next: number | null) {
    setStars(next);
    setPage(1);
  }

  return (
    <div className="mt-4 grid gap-4">
      {breakdown.data && (
        <RatingBreakdown
          breakdown={breakdown.data.breakdown}
          average={breakdown.data.average}
          count={breakdown.data.count}
          selected={stars}
          onSelect={select}
        />
      )}

      {stars !== null && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Showing {stars}-star reviews</span>
          <button
            type="button"
            onClick={() => select(null)}
            className="font-semibold text-teal-800 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      <ReviewList
        page={query.data}
        onPageChange={setPage}
        isLoading={query.isPending}
        emptyLabel={
          stars !== null ? `No written ${stars}-star reviews.` : 'No written reviews yet.'
        }
        onReport={isAuthenticated ? setReporting : undefined}
      />

      {reporting && (
        <ReportReview
          professionalId={professionalId}
          review={reporting}
          onClose={() => setReporting(null)}
        />
      )}
    </div>
  );
}
