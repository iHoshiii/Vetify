import { MAP_DEDUP_RADIUS_M } from '@shared/limits';

import { metersBetween } from './geo';

/** Words too common in clinic names to carry any identity. */
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

/** Strips punctuation and generic words, then sorts so word order stops mattering. */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !GENERIC_WORDS.has(word))
    .sort()
    .join(' ');
}

/** True when two places are close enough — or similarly named and near enough — to be one place. */
export function isSamePlace(
  a: { latitude: number; longitude: number; name: string },
  b: { latitude: number; longitude: number; name: string }
): boolean {
  const apart = metersBetween(a, b);
  if (apart <= MAP_DEDUP_RADIUS_M) return true;

  const named = normaliseName(a.name);
  return named.length >= 4 && named === normaliseName(b.name) && apart <= MAP_DEDUP_RADIUS_M * 5;
}
