import type { MyLocation } from '@/hooks/use-my-location';
import { useNearbyProfessionals } from '@/hooks/useProfessionals';
import { BOOKING_NEAREST_LIMIT, PROFESSIONAL_NEAR_RADIUS_NATIONWIDE_KM } from '@shared/limits';

/** The vet comes before the service, so the shortlist cannot yet bound itself to a drive. */
export const NEAREST_RADIUS_KM = PROFESSIONAL_NEAR_RADIUS_NATIONWIDE_KM;

/** The nearest bookable vets to a point, nearest first. Empty until there are coordinates. */
export function useNearestVets(location: MyLocation | null) {
  const query = useNearbyProfessionals(
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: NEAREST_RADIUS_KM,
          limit: BOOKING_NEAREST_LIMIT,
          available: true,
        }
      : null
  );

  // The server already answers nearest-first, so the shortlist is the head of its list.
  const items = (query.data?.items ?? []).slice(0, BOOKING_NEAREST_LIMIT);

  return { items, isPending: query.isFetching, error: query.isError ? query.error : null };
}
