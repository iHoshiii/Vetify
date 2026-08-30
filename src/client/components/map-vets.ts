import { MAP_DEDUP_RADIUS_M } from '@shared/limits';
import type { ProfessionalAvailabilityStatus } from '@shared/limits';
import type { ProfessionalAddressKind } from '@shared/schemas';

import type { PublicProfessional } from '../services/professionals.service';

/**
 * What a Vetify vet looks like once it is a pin, and the arithmetic the map needs to
 * place one honestly.
 *
 * Its own module rather than lines inside `VetMap`, because three callers convert the
 * same directory entries — the map, the preview beside it, and the full-screen modal —
 * and because the two functions at the bottom are the ones worth testing on their own.
 */

/** One pin: a published address, and enough of its vet to be worth clicking. */
export type MapVet = {
  /** The application id, which is what `/professionals/:id` and the booking link take. */
  id: string;
  /**
   * Unique per pin rather than per vet. A vet may publish their clinic and their home,
   * and those are two markers pointing at one profile.
   */
  key: string;
  kind: ProfessionalAddressKind;
  name: string;
  clinicName: string | null;
  /** The address as a line, which is what the popup shows. */
  addressLine: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  /** Only present when the vet arrived from a ranked "near me" answer. */
  distanceMeters?: number;
};

/**
 * Directory entries to pins, dropping every address without one.
 *
 * A vet with no published pin produces nothing at all rather than a marker at a guessed
 * coordinate: the whole design is that a pin exists because somebody placed it.
 */
export function toMapVets(
  professionals: Array<PublicProfessional & { distanceMeters?: number }>
): MapVet[] {
  return professionals.flatMap((professional) =>
    professional.addresses.flatMap((address) => {
      if (!address.mapPin) return [];

      return [
        {
          id: professional.id,
          key: `${professional.id}:${address.kind}`,
          kind: address.kind,
          name: professional.name ?? professional.clinicName ?? 'A verified vet',
          clinicName: professional.clinicName,
          addressLine: [address.line1, address.city, address.province].filter(Boolean).join(', '),
          latitude: address.mapPin.latitude,
          longitude: address.mapPin.longitude,
          specialties: professional.specialties,
          hourlyRate: professional.hourlyRate,
          availabilityStatus: professional.availabilityStatus,
          ...(professional.distanceMeters === undefined
            ? {}
            : { distanceMeters: professional.distanceMeters }),
        },
      ];
    })
  );
}

const EARTH_RADIUS_M = 6_371_000;

/** Degrees to radians, which is what every trig function below wants. */
function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * How far apart two coordinates are, in metres.
 *
 * Haversine rather than the flat approximation, not because the difference matters at
 * eighty metres but because the same function reads distances the server did not
 * calculate — a preview card and a dedup check should not disagree with `$geoNear`.
 */
export function metersBetween(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const half =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(half)));
}

/**
 * The words that say what a place is rather than which place it is.
 *
 * Stripped before comparing, so "Happy Paws Clinic" and "Happy Paws Veterinary
 * Hospital" are recognised as one building rather than two.
 */
const GENERIC_WORDS = new Set([
  'and',
  'animal',
  'animals',
  'care',
  'center',
  'centre',
  'clinic',
  'companion',
  'dr',
  'hospital',
  'inc',
  'pet',
  'pets',
  'the',
  'vet',
  'veterinary',
]);

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !GENERIC_WORDS.has(word))
    .sort()
    .join(' ');
}

/**
 * Whether an OpenStreetMap clinic and a Vetify pin are the same door.
 *
 * A verified clinic is frequently already an `amenity=veterinary` node, so without this
 * the map puts two markers on one building and the count double-reports it. Distance is
 * the primary signal; a matching name is the second, for the compound whose OSM node
 * sits on the gate while the vet pinned the consulting room.
 *
 * Deliberately asymmetric in what it does with a match: the caller drops the OSM node
 * and keeps ours, because ours is verified, bookable, and maintained by the person who
 * works there.
 */
export function isSamePlace(
  a: { latitude: number; longitude: number; name: string },
  b: { latitude: number; longitude: number; name: string }
): boolean {
  const apart = metersBetween(a, b);
  if (apart <= MAP_DEDUP_RADIUS_M) return true;

  // A name on its own is not enough — "Vetify" appears in plenty of them — so the
  // looser radius still bounds it. Short remainders are dropped: one word of three
  // letters after the generic ones are gone matches too much.
  const named = normaliseName(a.name);
  return named.length >= 4 && named === normaliseName(b.name) && apart <= MAP_DEDUP_RADIUS_M * 5;
}

/**
 * How far away something reads to a person: metres up close, one decimal until ten
 * kilometres, whole kilometres beyond.
 *
 * "1.2 km" rather than "1234 m", because a number nobody can picture is not an answer.
 * The word "away" is the caller's — a popup says it, a table column does not.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}
