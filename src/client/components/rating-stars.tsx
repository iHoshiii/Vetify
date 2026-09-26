import StarRating from '@/components/star-rating';
import { useState } from 'react';

import ReviewsDialog from './reviews-dialog';

// The average stars, made into a button that opens the full rater list. Falls back to plain display when there is nothing to open.
export default function RatingStars({
  professionalId,
  name,
  value,
  count,
}: {
  professionalId: string;
  name: string;
  value: number;
  count: number;
}) {
  const [open, setOpen] = useState(false);

  if (count === 0) return <StarRating value={value} count={count} />;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700/40"
        aria-label={`See ${count} review${count === 1 ? '' : 's'} for ${name}`}
      >
        <StarRating value={value} count={count} />
      </button>
      {open && (
        <ReviewsDialog professionalId={professionalId} name={name} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
