import { describe, expect, it } from 'vitest';

import {
  formatDistance,
  isSamePlace,
  metersBetween,
  toMapVets,
  type MapVet,
} from '../components/map-vets';
import type { PublicAddress, PublicProfessional } from '../services/professionals.service';

/**
 * The arithmetic the map is honest because of.
 *
 * Tested here rather than through `VetMap`, which needs Leaflet and a laid-out DOM to
 * say anything: the decision to drop a marker is made by `isSamePlace`, and the number a
 * popup prints is made by `formatDistance`. The component only obeys them.
 */

function address(overrides: Partial<PublicAddress> = {}): PublicAddress {
  return {
    kind: 'clinic',
    line1: '12 Mabini Street',
    city: 'Cebu City',
    province: 'Cebu',
    postalCode: '6000',
    mapPin: null,
    ...overrides,
  };
}

function vet(overrides: Partial<PublicProfessional> = {}): PublicProfessional {
  return {
    id: 'a1',
    userId: 'u1',
    name: 'Marites Reyes',
    avatarUrl: null,
    clinicName: 'Bayside Animal Clinic',
    clinicAddress: '12 Mabini Street, Cebu City',
    addresses: [address()],
    businessPhone: null,
    specialties: ['dentistry'],
    bio: 'A bio.',
    yearsExperience: 15,
    hourlyRate: 425,
    availabilityStatus: 'available',
    weeklySchedule: [],
    workHistory: [],
    verifiedAt: '2026-08-20T09:00:00.000Z',
    ...overrides,
  };
}

describe('turning directory entries into pins', () => {
  it('drops every address that has no pin', () => {
    expect(toMapVets([vet()])).toEqual([]);
  });

  it('makes one pin per published address, keyed apart', () => {
    const pins = toMapVets([
      vet({
        addresses: [
          address({ kind: 'clinic', mapPin: { latitude: 10.3, longitude: 123.9 } }),
          address({ kind: 'home', line1: '7 Sampaguita', mapPin: null }),
        ],
      }),
    ]);

    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({
      id: 'a1',
      key: 'a1:clinic',
      kind: 'clinic',
      name: 'Marites Reyes',
      addressLine: '12 Mabini Street, Cebu City, Cebu',
      latitude: 10.3,
      longitude: 123.9,
    });
    // Absent rather than undefined-valued: only a ranked answer has a distance.
    expect('distanceMeters' in pins[0]).toBe(false);
  });

  it('carries a distance through when the answer was ranked', () => {
    const [pin] = toMapVets([
      {
        ...vet({ addresses: [address({ mapPin: { latitude: 10.3, longitude: 123.9 } })] }),
        distanceMeters: 1234,
      },
    ]);

    expect(pin.distanceMeters).toBe(1234);
  });

  it('falls back to the clinic name for a vet with no account name', () => {
    const [pin] = toMapVets([
      vet({ name: null, addresses: [address({ mapPin: { latitude: 10.3, longitude: 123.9 } })] }),
    ]);

    expect(pin.name).toBe('Bayside Animal Clinic');
  });
});

describe('deciding whether two markers are one door', () => {
  const ours: Pick<MapVet, 'latitude' | 'longitude' | 'name'> = {
    latitude: 10.3157,
    longitude: 123.8854,
    name: 'Bayside Animal Clinic',
  };

  it('measures a known distance', () => {
    // A tenth of a degree of latitude is about 11.1 km, whatever the longitude.
    const apart = metersBetween(ours, { latitude: 10.4157, longitude: 123.8854 });
    expect(apart).toBeGreaterThan(11_000);
    expect(apart).toBeLessThan(11_200);
  });

  it('calls a clinic within the dedup radius the same place, whatever it is called', () => {
    // ~55 m north.
    const overpass = { latitude: 10.3162, longitude: 123.8854, name: 'Veterinary Office' };
    expect(metersBetween(ours, overpass)).toBeLessThan(80);
    expect(isSamePlace(ours, overpass)).toBe(true);
  });

  it('keeps a clinic down the road with a different name', () => {
    const overpass = { latitude: 10.325, longitude: 123.8854, name: 'Southside Pet Hospital' };
    expect(isSamePlace(ours, overpass)).toBe(false);
  });

  it('matches a renamed node across a compound, but not across town', () => {
    // ~330 m: past the dedup radius, inside the looser name-matched one.
    const sameName = { latitude: 10.3187, longitude: 123.8854, name: 'Bayside Vet Hospital' };
    expect(isSamePlace(ours, sameName)).toBe(true);

    const farAway = { latitude: 10.36, longitude: 123.8854, name: 'Bayside Vet Hospital' };
    expect(isSamePlace(ours, farAway)).toBe(false);
  });

  it('does not match on generic words alone', () => {
    const generic = { latitude: 10.3187, longitude: 123.8854, name: 'Animal Clinic' };
    expect(isSamePlace({ ...ours, name: 'The Pet Clinic' }, generic)).toBe(false);
  });
});

describe('writing a distance a person can picture', () => {
  it('uses metres up close and kilometres beyond', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(940.4)).toBe('940 m');
    expect(formatDistance(1234)).toBe('1.2 km');
    expect(formatDistance(9999)).toBe('10.0 km');
    expect(formatDistance(45_600)).toBe('46 km');
  });

  it('says nothing rather than something wrong', () => {
    expect(formatDistance(Number.NaN)).toBe('');
    expect(formatDistance(-1)).toBe('');
  });
});
