import { PROFESSIONAL_MAX_RATE_CAP } from '@shared/limits';
import { Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

/** What the list is narrowed by. Every field optional: absent means "do not narrow". */
export type VetFilters = {
  q: string;
  specialty: string;
  minExperience: string;
  maxRate: string;
};

export const NO_FILTERS: VetFilters = { q: '', specialty: '', minExperience: '', maxRate: '' };

const FIELD =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const LABEL = 'text-xs font-bold uppercase tracking-wider text-slate-500';

/** How long to wait before searching, so typing a word is one request and not six. */
const DEBOUNCE_MS = 300;

/**
 * The search box and the three sliders over it.
 *
 * The text box is debounced and the selects are not: a name is typed a letter at a
 * time, and a dropdown changes once. `onChange` is called with the whole filter set
 * rather than a field, so the page holds one piece of state and the URL could later be
 * derived from it without this component learning about routing.
 */
export default function VetFilters({
  value,
  onChange,
}: {
  value: VetFilters;
  onChange: (filters: VetFilters) => void;
}) {
  const ids = { q: useId(), specialty: useId(), experience: useId(), rate: useId() };

  // The box keeps its own text so it stays responsive while the debounce waits.
  const [typed, setTyped] = useState(value.q);

  useEffect(() => {
    if (typed === value.q) return;

    const timer = setTimeout(() => onChange({ ...value, q: typed }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed, value, onChange]);

  function set(field: keyof VetFilters) {
    return (event: { target: { value: string } }) =>
      onChange({ ...value, [field]: event.target.value });
  }

  return (
    <div className="grid gap-4 rounded-xl border border-slate-900/10 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label htmlFor={ids.q} className={LABEL}>
          Search
        </label>
        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            id={ids.q}
            type="search"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Name, clinic, city or street"
            className={`${FIELD} pl-9`}
          />
        </div>
      </div>

      <div>
        <label htmlFor={ids.specialty} className={LABEL}>
          Specialty
        </label>
        <input
          id={ids.specialty}
          value={value.specialty}
          onChange={set('specialty')}
          placeholder="Dentistry, surgery…"
          className={`${FIELD} mt-1`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={ids.experience} className={LABEL}>
            Min years
          </label>
          <input
            id={ids.experience}
            type="number"
            min={0}
            max={80}
            value={value.minExperience}
            onChange={set('minExperience')}
            placeholder="Any"
            className={`${FIELD} mt-1`}
          />
        </div>
        <div>
          <label htmlFor={ids.rate} className={LABEL}>
            Max rate
          </label>
          <input
            id={ids.rate}
            type="number"
            min={0}
            max={PROFESSIONAL_MAX_RATE_CAP}
            value={value.maxRate}
            onChange={set('maxRate')}
            placeholder="Any"
            className={`${FIELD} mt-1`}
          />
        </div>
      </div>
    </div>
  );
}
