import type { MyLocation } from '@/hooks/use-my-location';
import { useNearbyProfessionals } from '@/hooks/useProfessionals';
import type { NearbyProfessional } from '@/services/professionals.service';
import {
  BOOKING_CLINIC_RADIUS_KM,
  BOOKING_NEAREST_LIMIT,
  PROFESSIONAL_NEAR_RADIUS_NATIONWIDE_KM,
} from '@shared/limits';
import type { AppointmentKind } from '@shared/schemas';

import { offersKind } from './service-offer';

/** A clinic visit is a drive, so it is bounded. A call is not, so it looks nationwide. */
export function radiusFor(kind: AppointmentKind): number {
  return kind === 'onsite' ? BOOKING_CLINIC_RADIUS_KM : PROFESSIONAL_NEAR_RADIUS_NATIONWIDE_KM;
}

/** The virtual list re-sorts, so the five nearest are not the five it wants to show. */
const OVERFETCH = 5;

/** Onsite keeps the server's nearest-first order; virtual leads on experience instead. */
function rank(kind: AppointmentKind, items: NearbyProfessional[]): NearbyProfessional[] {
  if (kind === 'onsite') return items;

  return [...items].sort(
    (a, b) => b.yearsExperience - a.yearsExperience || a.distanceMeters - b.distanceMeters
  );
}

/** The shortlist for the chosen kind: disabled, and empty, until there are coordinates. */
export function useNearestVets(kind: AppointmentKind, location: MyLocation | null) {
  const query = useNearbyProfessionals(
    location
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          radiusKm: radiusFor(kind),
          limit: BOOKING_NEAREST_LIMIT * OVERFETCH,
          available: true,
        }
      : null
  );

  // Onsite drops a vet whose only pin is a home: near is not the same as visitable.
  const offered = (query.data?.items ?? []).filter((vet) => offersKind(vet, kind));
  const items = rank(kind, offered).slice(0, BOOKING_NEAREST_LIMIT);

  return { items, isPending: query.isFetching, error: query.isError ? query.error : null };
}
