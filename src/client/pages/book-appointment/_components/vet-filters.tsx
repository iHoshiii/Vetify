import { PROFESSIONAL_MAX_RATE_CAP } from '@shared/limits';
import { Search } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { FIELD, LABEL } from './styles';

export type VetFilters = {
  q: string;
  minExperience: string;
  maxRate: string;
};

export const NO_FILTERS: VetFilters = { q: '', minExperience: '', maxRate: '' };
const DEBOUNCE_MS = 300;

/** Search and optional filters for the vet directory. */
export default function VetFilters({
  value,
  onChange,
}: {
  value: VetFilters;
  onChange: (filters: VetFilters) => void;
}) {
  const ids = { q: useId(), experience: useId(), rate: useId() };
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
    <form
      className="grid gap-3 rounded-xl border border-slate-900/10 bg-white p-4 shadow-sm sm:grid-cols-[minmax(260px,1fr)_96px_110px_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onChange({ ...value, q: typed });
      }}
    >
      <div className="min-w-0">
        <label htmlFor={ids.q} className={LABEL}>
          Search by name or location
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
            className={`${FIELD} w-full pl-9`}
          />
        </div>
      </div>

      <div className="min-w-0">
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
          className={`${FIELD} mt-1 w-full`}
        />
      </div>
      <div className="min-w-0">
        <label htmlFor={ids.rate} className={LABEL}>
          Max rate (/hr)
        </label>
        <div className="relative mt-1">
          {value.maxRate !== '' && (
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-slate-500">
              ₱
            </span>
          )}
          <input
            id={ids.rate}
            type="number"
            min={0}
            max={PROFESSIONAL_MAX_RATE_CAP}
            value={value.maxRate}
            onChange={set('maxRate')}
            placeholder="Any"
            className={`${FIELD} w-full ${value.maxRate !== '' ? 'pl-7' : ''}`}
          />
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 text-sm font-bold text-white transition hover:bg-teal-900 sm:w-auto"
      >
        <Search className="h-4 w-4" aria-hidden />
        Search vets
      </button>
    </form>
  );
}
