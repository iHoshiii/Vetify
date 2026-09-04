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
  const ours: NearbyPlace[] = input.professionals.flatMap((vet) => {
    const pinned = vet.addresses.flatMap((address) =>
      address.mapPin
        ? [{ kind: address.kind, meters: metersBetween(input.from, address.mapPin) }]
        : []
    );
    // One row per published address, the way the map draws one pin per published address.
    if (pinned.length === 0) {
      return [
        {
          source: 'vetify' as const,
          key: `vetify:${vet.id}`,
          distanceMeters: vet.distanceMeters,
          kind: 'clinic' as const,
          vet,
        },
      ];
    }
    // $geoNear measured the nearest of them, so that row prints the server's number
    // and any second address is measured here rather than left blank.
    const nearest = Math.min(...pinned.map((address) => address.meters));
    return pinned.map((address) => ({
      source: 'vetify' as const,
      key: `vetify:${vet.id}:${address.kind}`,
      distanceMeters: address.meters === nearest ? vet.distanceMeters : address.meters,
      kind: address.kind,
      vet,
    }));
  });
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
