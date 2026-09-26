import { Star } from 'lucide-react';

// The rating histogram on a public profile: five bars, five stars at the top down to one, each a button that filters the list below to that score. Selected star highlights and toggles off on a second click.
export default function RatingBreakdown({
  breakdown,
  average,
  count,
  selected,
  onSelect,
}: {
  breakdown: number[];
  average: number;
  count: number;
  selected: number | null;
  onSelect: (star: number | null) => void;
}) {
  if (count === 0) return null;

  // The tallest bar sets the scale so a lone rating still draws a full row rather than a sliver.
  const max = Math.max(1, ...breakdown);

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900">{average.toFixed(1)}</span>
        <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
        <span className="text-sm text-slate-500">
          {count} {count === 1 ? 'rating' : 'ratings'}
        </span>
      </div>

      <ul className="mt-3 grid gap-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const value = breakdown[star - 1] ?? 0;
          const active = selected === star;
          return (
            <li key={star}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(active ? null : star)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition hover:bg-white ${
                  active ? 'bg-white ring-1 ring-teal-500' : ''
                }`}
              >
                <span className="flex w-9 shrink-0 items-center gap-0.5 text-xs font-semibold text-slate-600">
                  {star}
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${(value / max) * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500">
                  {value}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
