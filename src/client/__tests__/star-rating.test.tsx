import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StarRating from '../components/star-rating';

describe('StarRating', () => {
  it('states the score and the review count for a screen reader', () => {
    render(<StarRating value={4.6} count={12} />);

    expect(screen.getByLabelText('Rated 4.6 out of 5 from 12 reviews')).toBeInTheDocument();
    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('(12)')).toBeInTheDocument();
  });

  it('says review, not reviews, when there is only one', () => {
    render(<StarRating value={5} count={1} />);

    expect(screen.getByLabelText('Rated 5.0 out of 5 from 1 review')).toBeInTheDocument();
  });
});
