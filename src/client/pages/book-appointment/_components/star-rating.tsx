import { Star } from 'lucide-react';

// Five outlines with a filled overlay clipped to the score, so 4.3 reads as four and a third.
export default function StarRating({ value, count }: { value: number; count: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));

  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold text-slate-900"
      aria-label={`Rated ${value.toFixed(1)} out of 5 from ${count} review${
        count === 1 ? '' : 's'
      }`}
    >
      <span className="relative inline-flex" aria-hidden>
        <span className="flex text-slate-300">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-4 w-4" />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-amber-500"
          style={{ width: `${pct}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-4 w-4 shrink-0 fill-current" />
          ))}
        </span>
      </span>
      {value.toFixed(1)}
      <span className="font-normal text-slate-500">({count})</span>
    </span>
  );
}
