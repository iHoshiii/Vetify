import type { ProfessionalAvailabilityStatus } from '@shared/limits';
import { MAP_DEDUP_RADIUS_M } from '@shared/limits';
import type { ProfessionalAddressKind } from '@shared/schemas';

import type { NearbyProfessional, PublicProfessional } from '../services/professionals.service';

export type MapVet = {
  id: string;
  key: string;
  kind: ProfessionalAddressKind;
  name: string;
  clinicName: string | null;
  addressLine: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  distanceMeters?: number;
};

export type OsmClinic = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  openingHours?: string;
};

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
function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

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

export function isSamePlace(
  a: { latitude: number; longitude: number; name: string },
  b: { latitude: number; longitude: number; name: string }
): boolean {
  const apart = metersBetween(a, b);
  if (apart <= MAP_DEDUP_RADIUS_M) return true;

  const named = normaliseName(a.name);
  return named.length >= 4 && named === normaliseName(b.name) && apart <= MAP_DEDUP_RADIUS_M * 5;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

export type NearbyPlace =
  | { source: 'vetify'; key: string; distanceMeters: number; vet: NearbyProfessional }
  | { source: 'osm'; key: string; distanceMeters: number; clinic: OsmClinic };

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
