import { APPOINTMENT_RATING_COMMENT_MAX, APPOINTMENT_RATING_MAX } from '@shared/limits';
import { Star } from 'lucide-react';
import { useState } from 'react';

import { useRateAppointment } from '@/hooks/useAppointments';

const STARS = Array.from({ length: APPOINTMENT_RATING_MAX }, (_, i) => i + 1);

// The star picker with an optional note, shared by the booking row and the end-of-call screen. It owns the submit and collapses to a thank-you once the stars land.
export default function RateForm({
  appointmentId,
  heading,
  onRated,
}: {
  appointmentId: string;
  heading: string;
  onRated?: () => void;
}) {
  const rate = useRateAppointment();
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const [comment, setComment] = useState('');

  if (rate.isSuccess) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600">
        Thanks for rating
        <span className="inline-flex text-amber-500" aria-hidden>
          {STARS.map((n) => (
            <Star
              key={n}
              className={`h-4 w-4 ${n <= picked ? 'fill-current' : 'text-slate-300'}`}
            />
          ))}
        </span>
      </p>
    );
  }

  // Hover previews a score, a click locks it in, and only then is submit live.
  const shown = hover || picked;

  const submit = () =>
    rate.mutate(
      { id: appointmentId, rating: picked, comment: comment.trim() || null },
      { onSuccess: () => onRated?.() }
    );

  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{heading}</p>
      <div className="mt-1.5 flex" onMouseLeave={() => setHover(0)}>
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

      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={APPOINTMENT_RATING_COMMENT_MAX}
        rows={2}
        placeholder="Add a note (optional)"
        className="mt-2 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
      />

      <button
        type="button"
        disabled={!picked || rate.isPending}
        onClick={submit}
        className="mt-2 inline-flex h-9 items-center rounded-lg bg-teal-800 px-4 text-sm font-bold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {rate.isPending ? 'Sending…' : 'Submit rating'}
      </button>

      {rate.isError && (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{rate.error.message}</p>
      )}
    </div>
  );
}
