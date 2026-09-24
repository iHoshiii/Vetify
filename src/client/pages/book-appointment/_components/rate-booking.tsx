import { APPOINTMENT_RATING_MAX } from '@shared/limits';
import { Star } from 'lucide-react';
import { useState } from 'react';

import { useRateAppointment } from '@/hooks/useAppointments';
import type { Appointment } from '@/services/appointments.service';

const STARS = Array.from({ length: APPOINTMENT_RATING_MAX }, (_, i) => i + 1);

// The owner's one chance to rate the vet, shown on a finished booking. Collapses to a read-only line once a star is sent, because the server takes only the first.
export default function RateBooking({ booking }: { booking: Appointment }) {
  const rate = useRateAppointment();
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);

  const rating = booking.rating;
  if (rating !== null) {
    return (
      <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
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
    );
  }

  // Hover previews a score, a click locks it in, and only then is submit live.
  const shown = hover || picked;

  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-slate-700">How was your consultation?</p>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {STARS.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} of ${APPOINTMENT_RATING_MAX} stars`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setPicked(n)}
              className="p-0.5 text-amber-500"
            >
              <Star className={`h-6 w-6 ${n <= shown ? 'fill-current' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!picked || rate.isPending}
          onClick={() => rate.mutate({ id: booking.id, rating: picked })}
          className="inline-flex h-9 items-center rounded-lg bg-teal-800 px-4 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rate.isPending ? 'Sending…' : 'Submit rating'}
        </button>
      </div>
      {rate.isError && (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{rate.error.message}</p>
      )}
    </div>
  );
}
