import { MAP_DEDUP_RADIUS_M } from '@shared/limits';
import type { ProfessionalAvailabilityStatus } from '@shared/limits';
import type { ProfessionalAddressKind } from '@shared/schemas';

import type { NearbyProfessional, PublicProfessional } from '../services/professionals.service';

/**
 * What a Vetify vet looks like once it is a pin, and the arithmetic the map needs to
 * place one honestly.
 *
 * Its own module rather than lines inside `VetMap`, because three callers convert the
 * same directory entries — the map, the preview beside it, and the full-screen modal —
 * and because the arithmetic at the bottom is what is worth testing on its own.
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
 * A clinic as OpenStreetMap has it: a name, a coordinate, and whatever tags somebody
 * in that neighbourhood happened to fill in.
 *
 * Here rather than inside `VetMap` because it stopped being the map's private business
 * the moment the panel beside the map had to rank these against Vetify's own vets. The
 * coordinate is spelled out rather than left as Overpass's `lat`/`lon`, so one
 * vocabulary serves both sources and the arithmetic below needs no adapter.
 */
export type OsmClinic = {
  /** OSM's own name for it, `node/123` or `way/456` — unique across both, which a bare id is not. */
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  openingHours?: string;
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

/**
 * One row of "nearest you", from whichever of the two sources it came.
 *
 * A tagged union rather than one flattened shape, because the two are not the same claim
 * and the panel must not pretend they are: a Vetify vet is verified, has a profile and
 * can be booked, and an OpenStreetMap clinic is a name somebody typed into a public map.
 * Making the caller narrow on `source` is what forces it to say which it is showing.
 *
 * The Vetify branch carries the whole `NearbyProfessional` rather than a `MapVet`, so the
 * row keeps the avatar, the rate and the availability it already renders.
 */
export type NearbyPlace =
  | { source: 'vetify'; key: string; distanceMeters: number; vet: NearbyProfessional }
  | { source: 'osm'; key: string; distanceMeters: number; clinic: OsmClinic };

/**
 * The two sources, merged into one list, nearest first.
 *
 * Vetify's vets arrive already ranked by `$geoNear`, so their distance is the server's and
 * is not recomputed — nothing good comes of a list whose numbers disagree with the
 * query that produced it. The OpenStreetMap clinics have never been near a database, so
 * theirs is measured here, against the same haversine the dedup uses.
 *
 * Two things get dropped. A clinic further than the radius, because the radius is what the
 * panel promised in writing; and a clinic that is one of ours under another name, by the
 * same `isSamePlace` test the map uses — a door with a Vetify pin on it appears once,
 * as the verified vet, not twice.
 */
export function rankNearby(input: {
  from: { latitude: number; longitude: number };
  /** Server-ranked and already inside the radius. Their distance is taken as given. */
  professionals: NearbyProfessional[];
  clinics: OsmClinic[];
  /** Every Vetify pin the page knows of, which is what an OSM clinic is checked against. */
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

  // The ranked vets' own pins are folded in, so a caller that passes only the directory's
  // pins still cannot end up showing a vet and their OSM twin side by side.
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
        // Ours first on a tie: at the same distance the bookable one is the better answer.
        a.distanceMeters - b.distanceMeters ||
        Number(a.source === 'osm') - Number(b.source === 'osm')
    )
    .slice(0, input.limit);
}
