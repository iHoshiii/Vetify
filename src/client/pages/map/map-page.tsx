import { rankNearby, toMapVets, type MapVet, type NearbyPlace } from '@/components/map-vets';
import { useOsmClinics } from '@/hooks/useOsmClinics';
import { useNearbyProfessionals, useProfessionals } from '@/hooks/useProfessionals';
import { PROFESSIONAL_NEAR_LIMIT, PROFESSIONAL_NEAR_RADIUS_KM } from '@shared/limits';
import { Map as MapIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import InteractiveMap from './_components/interactive-map/map-official';
import NearestVets from './_components/nearest-vets';
import { useMyLocation } from './_components/use-my-location';

/**
 * The page that has to mean its own headline.
 *
 * Three queries feed it, and they answer different questions. The directory page draws
 * every published pin on the map, whether or not the visitor has shared a location — a
 * vet who turned their switch on is on the map for everybody. The nearest query only
 * runs once somebody has pressed the button, and its answer is an *ordering*, which is
 * what the panel under the headline is for. And OpenStreetMap's clinics, which the map
 * has always drawn, are fetched here rather than inside `VetMap`.
 *
 * That last move is the point of this page owning them. While the map fetched its own
 * clinics they went into its private state, so the panel beside it could rank only
 * Vetify's vets — and "find a vet near you" would answer with nothing while a clinic
 * sat visible on the map two streets away. One owner, two readers.
 *
 * The first two are merged for the map because the ranked answer carries a distance and
 * the directory does not: a popup that can say "1.2 km away" should.
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

  /**
   * Overpass is asked once somebody has a reason to care: they shared a location, so the
   * list has to rank clinics, or they opened the full-screen map, which draws them. A
   * country-wide scan of a volunteer-run service is not something to run for a visitor
   * who only read the headline.
   */
  const clinics = useOsmClinics(Boolean(location) || expanded);

  const vets = useMemo<MapVet[]>(() => {
    const byKey = new Map<string, MapVet>();
    for (const vet of toMapVets(directory.data?.items ?? [])) byKey.set(vet.key, vet);
    // Second, so a ranked entry overwrites the same address from the directory and the
    // popup gains the distance.
    for (const vet of toMapVets(nearby.data?.items ?? [])) byKey.set(vet.key, vet);
    return [...byKey.values()];
  }, [directory.data, nearby.data]);

  /**
   * The panel's list: both sources, nearest first.
   *
   * Empty without a location, because every row in it is a distance and there is nothing
   * to measure from. `vets` rather than only the ranked answer is handed in as the dedup
   * set, so a clinic that already has a Vetify pin on it is dropped here exactly as the
   * map drops it — one door, one row, ours.
   */
  const places = useMemo<NearbyPlace[]>(() => {
    if (!location) return [];

    return rankNearby({
      from: location,
      professionals: nearby.data?.items ?? [],
      clinics: clinics.data ?? [],
      pins: vets,
      radiusKm: nearby.data?.radiusKm ?? PROFESSIONAL_NEAR_RADIUS_KM,
      limit: PROFESSIONAL_NEAR_LIMIT,
    });
  }, [location, nearby.data, clinics.data, vets]);

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6fbfb] text-slate-950 flex flex-col justify-center">
      {/* ── HERO + MAP ───────────────────────────────────────── */}
      <section className="flex items-center px-5 sm:px-10 max-w-7xl mx-auto py-8 gap-8 lg:gap-12 w-full">
        {/* LEFT — Text */}
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

          {/* The headline's own promise, in this column because the map beside it is
              hidden below `lg`. */}
          <NearestVets
            status={status}
            onAsk={ask}
            places={places}
            loading={(nearby.isPending && Boolean(location)) || clinics.isLoading}
            vetsFailed={nearby.isError}
            clinicsFailed={clinics.isError}
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
        </div>

        {/* RIGHT — Interactive Vet Map (Client Component Boundary) */}
        <InteractiveMap
          vets={vets}
          clinics={clinics.data ?? []}
          clinicsLoading={clinics.isLoading}
          clinicsFailed={clinics.isError}
          userLocation={location}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onClose={() => setExpanded(false)}
        />
      </section>
    </main>
  );
}
