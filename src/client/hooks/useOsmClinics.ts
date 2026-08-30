import type { OsmClinic } from '@/components/map-vets';
import { fetchOsmClinics } from '@/services/osm.service';
import { useQuery } from '@tanstack/react-query';

/**
 * The OpenStreetMap clinics, fetched once and shared.
 *
 * One key with no parameters, because there is one query: the whole country, which is
 * what `VetMap` has always asked for. That is the point of putting it here — the map, the
 * preview beside it and the "nearest you" panel all read the same cache entry, so opening
 * the full-screen map after sharing a location costs nothing.
 */
export const osmKeys = {
  all: ['osm'] as const,
  clinics: () => [...osmKeys.all, 'clinics'] as const,
};

/**
 * Enabled by the caller rather than always on.
 *
 * The query is a country-wide Overpass scan, and Overpass is run by volunteers. Nobody
 * who has not opened the map or shared a location has asked this question, so nobody who
 * has not should be paying for it — theirs or ours.
 *
 * `staleTime: Infinity` for the session: a clinic mapped in OpenStreetMap this morning
 * does not move this afternoon, and re-asking on every remount would be the one thing a
 * public mirror would be right to rate-limit. `retry: false` because the three mirrors
 * inside `fetchOsmClinics` are already the retry.
 */
export function useOsmClinics(enabled: boolean) {
  return useQuery<OsmClinic[]>({
    queryKey: osmKeys.clinics(),
    queryFn: ({ signal }) => fetchOsmClinics(signal),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
