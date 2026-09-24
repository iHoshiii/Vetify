import { APPOINTMENT_RATING_MAX } from '@shared/limits';
import { Star } from 'lucide-react';

import type { Appointment } from '@/services/appointments.service';

import RateForm from './rate-form';

const STARS = Array.from({ length: APPOINTMENT_RATING_MAX }, (_, i) => i + 1);

// The owner's one chance to rate the vet, shown on a finished booking. Once a star is sent it collapses to the score and any note, because the server takes only the first.
export default function RateBooking({ booking }: { booking: Appointment }) {
  const rating = booking.rating;

  if (rating !== null) {
    return (
      <div className="mt-3">
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
          You rated this
          <span className="inline-flex text-amber-500" aria-hidden>
            {STARS.map((n) => (
              <Star
                key={n}
                className={`h-4 w-4 ${n <= rating ? 'fill-current' : 'text-slate-300'}`}
              />
            ))}
          </span>
          {rating} of {APPOINTMENT_RATING_MAX}
        </p>
        {booking.ratingComment && (
          <p className="mt-1 text-sm text-slate-600">&ldquo;{booking.ratingComment}&rdquo;</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <RateForm appointmentId={booking.id} heading="How was your consultation?" />
    </div>
  );
}
