import { MAP_NEAREST_LIMIT } from '@shared/limits';
import { describe, expect, it } from 'vitest';

import {
  formatDistance,
  isSamePlace,
  metersBetween,
  rankNearby,
  toMapVets,
  vetLabel,
  vetSubLabel,
  type MapVet,
  type OsmClinic,
} from '../components/map-prof-vet';
import type {
  NearbyProfessional,
  PublicAddress,
  PublicProfessional,
} from '../services/professionals.service';

/**
 * The arithmetic the map is honest because of.
 *
 * Tested here rather than through `VetMap`, which needs Leaflet and a laid-out DOM to
 * say anything: the decision to drop a marker is made by `isSamePlace`, the number a
 * popup prints is made by `formatDistance`, and the order of the list beside the map is
 * made by `rankNearby`. The components only obey them.
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

describe('merging the two sources into one list', () => {
  /** Solano, Nueva Vizcaya — the corner of the map the report came from. */
  const from = { latitude: 16.51, longitude: 121.18 };

  /** A point a known number of metres due north, so a distance can be asserted. */
  function north(meters: number, name = 'A Clinic'): OsmClinic {
    return {
      id: `node/${Math.round(meters)}`,
      name,
      latitude: from.latitude + meters / 111_195,
      longitude: from.longitude,
    };
  }

  /** A server-ranked vet: the pin it published, and the distance $geoNear measured. */
  function ranked(
    distanceMeters: number,
    overrides: Partial<PublicProfessional> = {}
  ): NearbyProfessional {
    return {
      ...vet({
        addresses: [address({ mapPin: { latitude: from.latitude, longitude: from.longitude } })],
        ...overrides,
      }),
      distanceMeters,
    };
  }

  const OPTIONS = { from, pins: [] as MapVet[], radiusKm: 50, limit: 10 };

  it('groups ours above theirs, nearest first inside each group', () => {
    const places = rankNearby({
      ...OPTIONS,
      professionals: [ranked(9000), ranked(1200, { id: 'a2' })],
      clinics: [north(4100, 'Bambang Vet'), north(300, 'Solano Pet Care')],
    });

    expect(places.map((place) => place.source)).toEqual(['vetify', 'vetify', 'osm', 'osm']);
    expect(places.map((place) => Math.round(place.distanceMeters))).toEqual([
      1200, 9000, 300, 4100,
    ]);
    expect(places[2].source === 'osm' && places[2].clinic.name).toBe('Solano Pet Care');
  });

  it("takes the server's distance rather than recomputing it", () => {
    // The published pin is exactly `from`, so measuring here would say nought metres.
    // The list must still print what $geoNear said, or two halves of one page disagree.
    const [place] = rankNearby({ ...OPTIONS, professionals: [ranked(872)], clinics: [] });

    expect(place.distanceMeters).toBe(872);
  });

  it('drops an OpenStreetMap clinic that is one of ours under another name', () => {
    // ~40 m from the published pin: the same door, mapped twice.
    const twin = north(40, 'Veterinary Office');

    const places = rankNearby({
      ...OPTIONS,
      professionals: [ranked(1200)],
      clinics: [twin, north(300, 'Solano Pet Care')],
    });

    // Ours survives and the scraped twin does not, exactly as the map draws it.
    expect(places).toHaveLength(2);
    expect(places.some((place) => place.source === 'osm' && place.clinic.id === twin.id)).toBe(
      false
    );
  });

  it('checks a clinic against pins the ranked answer never mentioned', () => {
    // A vet on the map but outside the radius: not in `professionals`, still one door.
    const pins = toMapVets([
      vet({
        addresses: [address({ mapPin: { latitude: from.latitude, longitude: from.longitude } })],
      }),
    ]);

    const places = rankNearby({ ...OPTIONS, pins, professionals: [], clinics: [north(40)] });

    expect(places).toEqual([]);
  });

  it('excludes a clinic beyond the radius the panel promised', () => {
    const places = rankNearby({
      ...OPTIONS,
      radiusKm: 5,
      professionals: [],
      clinics: [north(4100, 'Bambang Vet'), north(6000, 'Bayombong Vet')],
    });

    expect(places).toHaveLength(1);
    expect(places[0].source === 'osm' && places[0].clinic.name).toBe('Bambang Vet');
  });

  it('keeps one of ours above a much nearer clinic, which is the point of grouping', () => {
    // The uncomfortable case, asserted rather than left to be discovered: a registered vet
    // right at the edge of the radius still outranks a scraped clinic three streets away.
    const places = rankNearby({
      ...OPTIONS,
      professionals: [ranked(48_000)],
      clinics: [north(300, 'Somebody Else')],
    });

    expect(places.map((place) => place.source)).toEqual(['vetify', 'osm']);
  });

  it('still orders ours among themselves by the distance the server gave', () => {
    const places = rankNearby({
      ...OPTIONS,
      professionals: [ranked(4000), ranked(120, { id: 'a2' }), ranked(2000, { id: 'a3' })],
      clinics: [],
    });

    expect(places.map((place) => place.distanceMeters)).toEqual([120, 2000, 4000]);
  });

  it('keeps only as many as it was asked for, ours taking the slots first', () => {
    const places = rankNearby({
      ...OPTIONS,
      limit: 3,
      professionals: [ranked(1200)],
      clinics: [north(100), north(200), north(400), north(800)],
    });

    expect(places).toHaveLength(3);
    expect(places.map((place) => Math.round(place.distanceMeters))).toEqual([1200, 100, 200]);
  });

  it('returns what it has when that is fewer than the limit, padding nothing', () => {
    // The other half of "the top five nearest": five when there are more than five, and
    // two when there are two. `slice` is what makes that true and it never pads, but the
    // phrasing is the kind that invites a fixed-length list of five with three blanks in
    // it, so the rule is pinned here rather than left to be inferred from the method.
    const places = rankNearby({
      ...OPTIONS,
      limit: MAP_NEAREST_LIMIT,
      professionals: [ranked(1200)],
      clinics: [north(300, 'Solano Pet Care')],
    });

    expect(places).toHaveLength(2);
    expect(places.map((place) => Math.round(place.distanceMeters))).toEqual([1200, 300]);
  });

  it('gives every slot to ours when there are enough of them to fill the list', () => {
    // What MAP_NEAREST_LIMIT does on a busy map: five registered vets in range and the
    // scraped clinics are off the list, wherever they are. The map still draws them.
    const places = rankNearby({
      ...OPTIONS,
      limit: MAP_NEAREST_LIMIT,
      professionals: [1000, 2000, 3000, 4000, 5000, 6000].map((meters, index) =>
        ranked(meters, { id: `a${index}` })
      ),
      clinics: [north(300, 'Right There')],
    });

    expect(places).toHaveLength(MAP_NEAREST_LIMIT);
    expect(places.every((place) => place.source === 'vetify')).toBe(true);
  });
});

describe('naming a pin after what it is', () => {
  const reyes = { name: 'Marites Reyes', clinicName: 'Bayside Animal Clinic' };

  it('names a home after the vet and a clinic after the clinic', () => {
    expect(vetLabel({ ...reyes, kind: 'home' })).toBe('Marites Reyes');
    expect(vetLabel({ ...reyes, kind: 'clinic' })).toBe('Bayside Animal Clinic');
  });

  it('adds the vet under the clinic name, and nothing under their own', () => {
    expect(vetSubLabel({ ...reyes, kind: 'clinic' })).toBe('Marites Reyes');
    expect(vetSubLabel({ ...reyes, kind: 'home' })).toBeNull();
    expect(vetSubLabel({ ...reyes, clinicName: null, kind: 'clinic' })).toBeNull();
  });
});
