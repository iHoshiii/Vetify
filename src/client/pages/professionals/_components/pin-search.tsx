import { searchPlaces, type FoundPlace } from '@/services/geocode.service';
import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

import type { Point } from './pin-picker';

type Props = { onPick: (point: Point, zoom: number) => void };

// Typing the clinic's name or street beats dragging a pin across a country
export default function PinSearch({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function run() {
    const asked = query.trim();
    if (!asked) return;
    setBusy(true);
    setMessage('');
    try {
      const found = await searchPlaces(asked);
      setResults(found);
      if (!found.length) setMessage('Nothing found. Try the street and the city.');
    } catch {
      setResults([]);
      setMessage('The search is not answering. Drag the pin instead.');
    } finally {
      setBusy(false);
    }
  }

  // Choosing a result moves the pin, which is what fills the address line
  function choose(place: FoundPlace) {
    onPick({ latitude: place.latitude, longitude: place.longitude }, place.zoom);
    setQuery(place.label);
    setResults([]);
  }

  return (
    <div className="absolute left-3 top-14 z-[600] w-[min(22rem,calc(100%-1.5rem))] sm:top-3 sm:w-80">
      <div className="flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow-md ring-1 ring-slate-200 backdrop-blur-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter would send the enquiry the map is sitting inside, so the key stops here
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            void run();
          }}
          placeholder="Search a clinic, street or city"
          aria-label="Search for a place"
          className="w-full rounded-md bg-transparent px-2 py-1.5 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !query.trim()}
          aria-label="Search"
          className="shrink-0 rounded-md bg-teal-800 p-1.5 text-white hover:bg-teal-900 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Search className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
      </div>

      {message && (
        <p className="mt-1 rounded-md bg-white/95 px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-md ring-1 ring-slate-200">
          {message}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-1 max-h-56 overflow-y-auto rounded-lg bg-white/95 py-1 shadow-md ring-1 ring-slate-200 backdrop-blur-sm">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="block w-full px-3 py-2 text-left text-xs leading-4 text-slate-700 hover:bg-teal-50 hover:text-teal-900"
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
