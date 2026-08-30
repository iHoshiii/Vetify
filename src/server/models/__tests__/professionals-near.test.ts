import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  findProfessionalsNear,
  insertProfessional,
  toNearbyProfessional,
  updateAddressMap,
  updateProfessionalProfile,
  type ProfessionalAttrs,
} from '../professionals';
import { insertUser, updateUser, type User, type UserStatus } from '../users';

/**
 * The geospatial half of the directory.
 *
 * Its own file rather than more of `professionals.test.ts`, because almost everything
 * here is an assertion about `$geoNear` and the 2dsphere index rather than about our
 * own arithmetic: which documents the index holds, what it does with an array of them,
 * and what it leaves out. Those are the properties the design leans on, and a comment
 * claiming them is worth less than a mongod agreeing with them.
 */

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

/** Cebu City, near enough. Every distance below is measured from here. */
const HERE = { latitude: 10.3157, longitude: 123.8854 };

/**
 * A degree of latitude, in metres.
 *
 * Latitude and not longitude on purpose: a degree of longitude narrows towards the
 * poles, so offsetting north keeps the arithmetic below a plain multiplication.
 */
const DEGREE_M = 111_195;

/** Within a percent, which is as much as the sphere model is worth arguing about. */
function expectMetres(actual: number, expected: number) {
  expect(actual).toBeGreaterThan(expected * 0.99);
  expect(actual).toBeLessThan(expected * 1.01);
}

async function account(status: UserStatus = 'active') {
  seq += 1;
  return await insertUser({
    email: `near${seq}@example.com`,
    password: 'pw12345678',
    name: `Dr Near ${seq}`,
    status,
  });
}

function address(kind: 'clinic' | 'home') {
  return {
    kind,
    line1: kind === 'clinic' ? '12 Mabini Street' : '44 Sampaguita Lane',
    city: 'Cebu City',
    province: 'Cebu',
    postalCode: '6000',
    fix: null,
  };
}

function attrs(user: User): ProfessionalAttrs {
  seq += 1;
  return {
    user: user._id,
    fullName: `Vet ${seq} Reyes`,
    licenseNumber: `NEAR-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    clinicName: 'Bayside Animal Clinic',
    addresses: [address('clinic'), address('home')],
    businessPhone: '+63 32 555 0101',
    bio: 'Small animal practice, fifteen years of it, mostly cats who disagree.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
    status: 'verified',
  };
}

/** A point `northKm` due north of HERE, which makes the expected distance that number. */
function north(northKm: number) {
  return { latitude: HERE.latitude + (northKm * 1000) / DEGREE_M, longitude: HERE.longitude };
}

/**
 * A verified vet with one address pinned `northKm` north of HERE.
 *
 * `published: false` is what the switch off looks like, and it is how the tests below
 * check that a placed-but-hidden pin is invisible to a search rather than merely
 * unlabelled.
 */
async function vetAt(
  northKm: number,
  options: {
    kind?: 'clinic' | 'home';
    published?: boolean;
    status?: UserStatus;
    available?: boolean;
  } = {}
) {
  const owner = await account(options.status);
  const application = await insertProfessional(attrs(owner));

  if (options.available === false) {
    await updateProfessionalProfile(application._id, { availabilityStatus: 'unavailable' });
  }

  await updateAddressMap(application._id, {
    kind: options.kind ?? 'clinic',
    pin: north(northKm),
    showOnMap: options.published ?? true,
  });

  return { owner, id: application._id.toString() };
}

function search(overrides: { radiusKm?: number; limit?: number; available?: boolean } = {}) {
  return findProfessionalsNear({
    latitude: HERE.latitude,
    longitude: HERE.longitude,
    radiusKm: overrides.radiusKm ?? 50,
    limit: overrides.limit ?? 10,
    available: overrides.available,
  });
}

describe('findProfessionalsNear', () => {
  it('answers nearest first, in metres', async () => {
    const far = await vetAt(20);
    const near = await vetAt(2);
    const middle = await vetAt(9);

    const found = await search();

    expect(found.map((row) => row._id.toString())).toEqual([near.id, middle.id, far.id]);
    expectMetres(found[0].distanceMeters, 2_000);
    expectMetres(found[2].distanceMeters, 20_000);
  });

  it('leaves out a vet who placed a pin and left the switch off', async () => {
    const shown = await vetAt(8);
    await vetAt(1, { published: false });

    // The assertion the whole two-field design rests on. A hidden pin is not merely
    // unlabelled in the answer — it is absent from the index, so $geoNear never
    // sees it, and the vet a kilometre away does not out-rank the one who agreed to
    // be found.
    const found = await search();

    expect(found).toHaveLength(1);
    expect(found[0]._id.toString()).toBe(shown.id);
  });

  it('leaves out a vet who never pinned anything', async () => {
    const owner = await account();
    await insertProfessional(attrs(owner));

    expect(await search()).toEqual([]);
  });

  it('stops at the radius', async () => {
    await vetAt(40);

    expect(await search({ radiusKm: 50 })).toHaveLength(1);
    expect(await search({ radiusKm: 20 })).toEqual([]);
  });

  it('drops a vet whose account is no longer active', async () => {
    const gone = await vetAt(1);
    const here = await vetAt(30);

    await updateUser(gone.owner._id, { status: 'suspended' });

    // Nearer, and still not in the answer: the account filter runs after the join,
    // which is why the search over-fetches before it.
    const found = await search();

    expect(found.map((row) => row._id.toString())).toEqual([here.id]);
  });

  it('ranks a vet who published both addresses by the nearer one', async () => {
    const owner = await account();
    const application = await insertProfessional(attrs(owner));

    await updateAddressMap(application._id, { kind: 'clinic', pin: north(30), showOnMap: true });
    await updateAddressMap(application._id, { kind: 'home', pin: north(3), showOnMap: true });

    // The index is multikey, and on an array field $geoNear reports the distance to
    // the nearest indexed element. Worth pinning down rather than assuming: it is
    // also the reason a hidden pin must be absent rather than flagged.
    const [found] = await search();

    expectMetres(found.distanceMeters, 3_000);
  });

  it('ranks by the published address and not the hidden one', async () => {
    const owner = await account();
    const application = await insertProfessional(attrs(owner));

    await updateAddressMap(application._id, { kind: 'clinic', pin: north(30), showOnMap: true });
    await updateAddressMap(application._id, { kind: 'home', pin: north(3), showOnMap: false });

    const [found] = await search();

    // Three kilometres away and correctly reported as thirty: the house they kept off
    // the map does not decide where a search thinks they are.
    expectMetres(found.distanceMeters, 30_000);
  });

  it('can be narrowed to the vets currently taking work', async () => {
    const taking = await vetAt(5);
    await vetAt(1, { available: false });

    expect((await search({ available: true })).map((row) => row._id.toString())).toEqual([
      taking.id,
    ]);
    // Both, when the caller did not ask.
    expect(await search()).toHaveLength(2);
  });

  it('counts a listing that never set availability as available', async () => {
    // Verified before the setting existed. A missing field is not a refusal to work.
    const older = await vetAt(4);

    expect((await search({ available: true })).map((row) => row._id.toString())).toEqual([
      older.id,
    ]);
  });

  it('returns no more than the limit asked for', async () => {
    await vetAt(1);
    await vetAt(2);
    await vetAt(3);

    expect(await search({ limit: 2 })).toHaveLength(2);
  });

  it('publishes the distance whole, beside the fields the directory shows', async () => {
    await vetAt(2);
    const [row] = await search();

    const entry = toNearbyProfessional(row);

    expect(entry.distanceMeters).toBe(Math.round(row.distanceMeters));
    // A phone's own idea of where it is standing does not deserve four decimals.
    expect(Number.isInteger(entry.distanceMeters)).toBe(true);
    expect(entry.addresses[0].mapPin).toMatchObject({ longitude: HERE.longitude });
    // The same privacy boundary as the directory: it is built on the same transform.
    expect(entry.addresses[0]).not.toHaveProperty('fix');
    expect(entry).not.toHaveProperty('licenseNumber');
  });
});
