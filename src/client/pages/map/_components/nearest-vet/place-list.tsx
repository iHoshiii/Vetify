import type { NearbyPlace } from '@/components/map-prof-vet';
import { ClinicRow } from './clinic-row';
import { VetRow } from './vet-row';

export function PlacesList({ places, loading }: { places: NearbyPlace[]; loading: boolean }) {
  if (places.length === 0 || loading) return null;

  return (
    <ul className="space-y-2">
      {places.map((place) =>
        place.source === 'vetify' ? (
          <VetRow key={place.key} vet={place.vet} />
        ) : (
          <ClinicRow key={place.key} clinic={place.clinic} distanceMeters={place.distanceMeters} />
        )
      )}
    </ul>
  );
}
