import { toMapVets, type MapVet } from '@/components/map-vets';
import { useNearbyProfessionals, useProfessionals } from '@/hooks/useProfessionals';
import { Map as MapIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import InfoCards from './_components/info-cards';
import InteractiveMap from './_components/interactive-map/map-official';
import NearestVets from './_components/nearest-vets';
import { useMyLocation } from './_components/use-my-location';

/**
 * The page that has to mean its own headline.
 *
 * Two queries feed it, and they answer different questions. The directory page draws
 * every published pin on the map, whether or not the visitor has shared a location — a
 * vet who turned their switch on is on the map for everybody. The nearest query only
 * runs once somebody has pressed the button, and its answer is an *ordering*, which is
 * what the panel under the headline is for.
 *
 * They are merged for the map because the ranked answer carries a distance and the
 * directory does not: a popup that can say "1.2 km away" should.
 */

/**
 * One page of the directory is enough to draw the map. Every vet with a pin is a vet
 * who was verified and chose to appear, which is a small number by construction, and
 * the pins that matter to somebody are the ones the ranked query brings back anyway.
 */
const MAP_PIN_LIMIT = 50;

export default function MapPage() {
  const [expanded, setExpanded] = useState(false);
  const { status, location, ask } = useMyLocation();

  const directory = useProfessionals({ limit: MAP_PIN_LIMIT });
  const nearby = useNearbyProfessionals(
    location ? { latitude: location.latitude, longitude: location.longitude } : null
  );

  const vets = useMemo<MapVet[]>(() => {
    const byKey = new Map<string, MapVet>();
    for (const vet of toMapVets(directory.data?.items ?? [])) byKey.set(vet.key, vet);
    // Second, so a ranked entry overwrites the same address from the directory and the
    // popup gains the distance.
    for (const vet of toMapVets(nearby.data?.items ?? [])) byKey.set(vet.key, vet);
    return [...byKey.values()];
  }, [directory.data, nearby.data]);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6fbfb] text-slate-950 flex flex-col justify-center">
      {/* ── HERO + MAP ───────────────────────────────────────── */}
      <section className="flex items-center px-5 sm:px-10 max-w-7xl mx-auto py-8 gap-8 lg:gap-12 w-full">
        {/* LEFT — Text + Info */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-[1.1] text-slate-900 sm:text-5xl">
              Find a vet
              <br />
              <span className="text-blue-600">near you.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-500 max-w-md">
              Vetify&apos;s verified vets, plus veterinary clinics and pet care services sourced
              live from OpenStreetMap — click any marker for details.
            </p>
          </div>

          {/* The headline's own promise. Above the info cards because it is the thing
              somebody came to do, and in this column because the map beside it is
              hidden below `lg`. */}
          <NearestVets
            status={status}
            onAsk={ask}
            vets={nearby.data?.items ?? []}
            loading={nearby.isPending && Boolean(location)}
            failed={nearby.isError}
            radiusKm={nearby.data?.radiusKm}
          />

          {/* The map column is `hidden lg:block`, so without this a phone has no way
              into the map at all — and pinning and finding are both things people do
              on a phone. */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-900/10 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-md transition-all hover:-translate-y-0.5 hover:border-blue-300 lg:hidden"
          >
            <MapIcon className="h-4 w-4" />
            Open the map
          </button>

          {/* Info cards (Static Server Component) */}
          <InfoCards />
        </div>

        {/* RIGHT — Interactive Vet Map (Client Component Boundary) */}
        <InteractiveMap
          vets={vets}
          userLocation={location}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onClose={() => setExpanded(false)}
        />
      </section>
    </main>
  );
}
