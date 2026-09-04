import { rankNearby, toMapVets, type MapVet, type NearbyPlace } from '@/components/map-prof-vet';
import { useOsmClinics } from '@/hooks/useOsmClinics';
import {
  professionalKeys,
  useNearbyProfessionals,
  useProfessionals,
} from '@/hooks/useProfessionals';
import { MAP_NEAREST_LIMIT, PROFESSIONAL_NEAR_RADIUS_KM } from '@shared/limits';
import { useQueryClient } from '@tanstack/react-query';
import { Map as MapIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import InteractiveMap from './_components/interactive-map/map-official';
import NearestVets from './_components/nearest-vet';
import { useMyLocation } from '@/hooks/use-my-location';

const MAP_PIN_LIMIT = 20;

export default function MapPage() {
  const [expanded, setExpanded] = useState(false);
  const { status, location, ask } = useMyLocation();
  const queryClient = useQueryClient();

  const directory = useProfessionals({ limit: MAP_PIN_LIMIT });
  const nearby = useNearbyProfessionals(
    location ? { latitude: location.latitude, longitude: location.longitude } : null
  );

  const clinics = useOsmClinics(Boolean(location) || expanded);

  const vets = useMemo<MapVet[]>(() => {
    const byKey = new Map<string, MapVet>();
    for (const vet of toMapVets(directory.data?.items ?? [])) byKey.set(vet.key, vet);
    for (const vet of toMapVets(nearby.data?.items ?? [])) byKey.set(vet.key, vet);
    return [...byKey.values()];
  }, [directory.data, nearby.data]);

  const places = useMemo<NearbyPlace[]>(() => {
    if (!location) return [];

    return rankNearby({
      from: location,
      professionals: nearby.data?.items ?? [],
      clinics: clinics.data ?? [],
      pins: vets,
      radiusKm: nearby.data?.radiusKm ?? PROFESSIONAL_NEAR_RADIUS_KM,
      limit: MAP_NEAREST_LIMIT,
    });
  }, [location, nearby.data, clinics.data, vets]);

  // An unchanged fix keeps the same query key, so the cached answer has to be dropped by hand.
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: professionalKeys.all });
    ask();
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-[#f6fbfb] text-slate-950 flex flex-col justify-center">
      {/* ── HERO + MAP ───────────────────────────────────────── */}
      <section className="flex items-center px-5 sm:px-10 max-w-7xl mx-auto py-8 gap-8 lg:gap-12 w-full">
        {/* LEFT — Text */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h1 className="text-4xl font-black tracking-tight leading-[1.1] text-slate-900 sm:text-5xl">
              Find a vet <span className="text-blue-600">near you.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-500 max-w-md">
              Vetify helps you track the nearest vet clinics and professional based on your
              location. You can also explore the map to find more clinics and vets in your area.
            </p>
          </div>

          <NearestVets
            status={status}
            onAsk={refresh}
            places={places}
            loading={(nearby.isPending && Boolean(location)) || clinics.isLoading}
            vetsFailed={nearby.isError}
            clinicsFailed={clinics.isError}
            radiusKm={nearby.data?.radiusKm}
          />

          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-900/10 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-md transition-all hover:-translate-y-0.5 hover:border-blue-300 lg:hidden"
          >
            <MapIcon className="h-4 w-4" />
            Open the map
          </button>
        </div>

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
