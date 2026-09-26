import ReviewList from '@/components/review-list';
import { useProfessionalReviews } from '@/hooks/useProfessionals';
import { useState } from 'react';

// The profile's Ratings panel: only reviews that carry a written note, newest first, names masked.
export default function VetRatings({ professionalId }: { professionalId: string }) {
  const [page, setPage] = useState(1);
  const query = useProfessionalReviews(professionalId, { page, comments: true });

  return (
    <div className="mt-4">
      <ReviewList
        page={query.data}
        onPageChange={setPage}
        isLoading={query.isPending}
        emptyLabel="No written reviews yet."
      />
    </div>
  );
}
