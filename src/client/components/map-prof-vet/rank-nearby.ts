import type { NearbyProfessional } from '../../services/professionals.service';

import type { MapVet, NearbyPlace, OsmClinic } from '@/types/map-prof-vet';
import { metersBetween } from './geo';
import { isSamePlace } from './same-place';
import { toMapVets } from './to-map-vets';

/** Our own vets first, then OSM clinics inside the radius that no pin already covers. */
export function rankNearby(input: {
  from: { latitude: number; longitude: number };
  professionals: NearbyProfessional[];
  clinics: OsmClinic[];
  pins: MapVet[];
  radiusKm: number;
  limit: number;
}): NearbyPlace[] {
  const ours: NearbyPlace[] = input.professionals.map((vet) => ({
    source: 'vetify',
    key: `vetify:${vet.id}`,
    distanceMeters: vet.distanceMeters,
    vet,
  }));
  const pins = [...input.pins, ...toMapVets(input.professionals)];
  const radiusMeters = input.radiusKm * 1000;

  const theirs: NearbyPlace[] = input.clinics.flatMap((clinic) => {
    const distanceMeters = metersBetween(input.from, clinic);
    if (distanceMeters > radiusMeters) return [];
    if (pins.some((pin) => isSamePlace(pin, clinic))) return [];

    return [{ source: 'osm' as const, key: `osm:${clinic.id}`, distanceMeters, clinic }];
  });

  return [...ours, ...theirs]
    .sort(
      (a, b) =>
        Number(a.source === 'osm') - Number(b.source === 'osm') ||
        a.distanceMeters - b.distanceMeters
    )
    .slice(0, input.limit);
}
