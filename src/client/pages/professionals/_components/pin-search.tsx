import { searchPlaces, type FoundPlace } from '@/services/geocode.service';
import { Loader2, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Point } from './pin-picker';

type Props = { onPick: (point: Point, zoom: number) => void };

// Long enough to be the end of a word, short enough not to feel like waiting
const TYPING_PAUSE = 1500;
const SHORTEST = 3;

// Typing the clinic's name or street beats dragging a pin across a country
export default function PinSearch({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // A chosen result puts its own name in the box, and that is not more typing
  const chosen = useRef('');
  const inflight = useRef<AbortController | null>(null);

  const search = useCallback(async (asked: string) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setBusy(true);
    setMessage('');
    try {
      const found = await searchPlaces(asked, controller.signal);
      setResults(found);
      if (!found.length) setMessage('Nothing found. Try the street and the city.');
    } catch {
      // An abort is not a failure: a newer question is already on its way
      if (controller.signal.aborted) return;
      setResults([]);
      setMessage('The search is not answering. Drag the pin instead.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);

  // Nominatim is run by volunteers, so it is asked once the typing stops, not per keystroke
  useEffect(() => {
    const asked = query.trim();
    if (!asked) {
      inflight.current?.abort();
      setResults([]);
      setMessage('');
      setBusy(false);
      return;
    }
    if (asked.length < SHORTEST || asked === chosen.current) return;
    const timer = setTimeout(() => void search(asked), TYPING_PAUSE);
    return () => clearTimeout(timer);
  }, [query, search]);

  function choose(place: FoundPlace) {
    inflight.current?.abort();
    chosen.current = place.label;
    onPick({ latitude: place.latitude, longitude: place.longitude }, place.zoom);
    setQuery(place.label);
    setResults([]);
    setBusy(false);
  }

  return (
    <div className="absolute left-3 top-14 z-[600] w-[min(22rem,calc(100%-1.5rem))] sm:top-3 sm:w-80">
      <div className="flex items-center gap-1.5 rounded-lg bg-white/95 px-2 py-1.5 shadow-md ring-1 ring-slate-200 backdrop-blur-sm">
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-teal-800" aria-hidden />
        ) : (
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
        )}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Enter would send the enquiry the map is sitting inside, and the pause searches anyway
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault();
          }}
          placeholder="Search a clinic, street or city"
          aria-label="Search for a place"
          className="w-full bg-transparent text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:outline-none"
        />
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
