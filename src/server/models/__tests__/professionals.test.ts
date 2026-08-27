import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  countProfessionalsByStatus,
  findProfessionalByUser,
  findProfessionals,
  findVerifiedProfessionals,
  insertProfessional,
  isDuplicateApplication,
  isDuplicateLicense,
  professionalsCollection,
  toOwnProfessional,
  toProfessionalPage,
  toPublicProfessional,
  updateProfessional,
  type ProfessionalAttrs,
} from '../professionals';
import { insertUser, updateUser, usersCollection, type User, type UserStatus } from '../users';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

/** An account to apply with. Each one needs its own email and its own licence. */
async function account(overrides: { name?: string | null; status?: UserStatus } = {}) {
  seq += 1;
  return await insertUser({
    email: `vet${seq}@example.com`,
    password: 'pw12345678',
    name: overrides.name ?? `Dr Vet ${seq}`,
    avatarUrl: `https://example.com/${seq}.png`,
    status: overrides.status ?? 'active',
  });
}

function attrs(
  user: User | ObjectId,
  overrides: Partial<ProfessionalAttrs> = {}
): ProfessionalAttrs {
  seq += 1;
  return {
    user: user instanceof ObjectId ? user : user._id,
    fullName: `Vet ${seq} Reyes`,
    licenseNumber: `VET-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    clinicName: 'Bayside Animal Clinic',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    businessPhone: '+63 32 555 0101',
    bio: 'Small animal practice, fifteen years of it, mostly cats who disagree.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
    ...overrides,
  };
}

/**
 * A verified vet with the verification pinned to a fixed moment. Several
 * verifications can land in the same millisecond, which would leave any ordering
 * assertion to chance.
 */
async function verified(when: string, overrides: Partial<ProfessionalAttrs> = {}, user?: User) {
  const owner = user ?? (await account());
  const application = await insertProfessional(attrs(owner, { ...overrides, status: 'verified' }));
  await professionalsCollection().updateOne(
    { _id: application._id },
    { $set: { reviewedAt: new Date(when) } }
  );
  return { owner, application };
}

describe('insertProfessional', () => {
  it('files an application as pending, with the consent dated and no verdict yet', async () => {
    const owner = await account();
    const application = await insertProfessional(attrs(owner));

    expect(application.status).toBe('pending');
    // The date, not a boolean: what matters later is when they agreed.
    expect(application.backgroundCheckConsentAt).toBeInstanceOf(Date);
    expect(application.reviewedBy).toBeNull();
    expect(application.reviewedAt).toBeNull();
    expect(application.rejectionReason).toBeNull();
    expect(application.specialties).toEqual([]);
  });

  it('refuses an application that names no real applicant', async () => {
    await expect(insertProfessional(attrs('not-an-id' as unknown as ObjectId))).rejects.toThrow();
  });

  it('lets the database refuse a second application from the same account', async () => {
    const owner = await account();
    await insertProfessional(attrs(owner));

    // Checking first would still race two submits; the unique index cannot.
    await expect(insertProfessional(attrs(owner))).rejects.toSatisfy(isDuplicateApplication);
  });

  it('lets the database refuse a licence that is already registered', async () => {
    const first = await account();
    await insertProfessional(attrs(first, { licenseNumber: 'VET 1234-PH' }));

    const second = await account();
    await expect(
      insertProfessional(attrs(second, { licenseNumber: 'VET 1234-PH' }))
    ).rejects.toSatisfy(isDuplicateLicense);
  });

  it('allows the same number under a different authority', async () => {
    // Two national registries can hand out the same number to different vets, so
    // uniqueness is on the pair rather than the number alone.
    const first = await account();
    await insertProfessional(
      attrs(first, { licenseNumber: 'VET 1234', licenseAuthority: 'PRC Philippines' })
    );

    const second = await account();
    const other = await insertProfessional(
      attrs(second, { licenseNumber: 'VET 1234', licenseAuthority: 'RCVS United Kingdom' })
    );

    expect(other.licenseNumber).toBe('VET 1234');
    expect(await professionalsCollection().countDocuments()).toBe(2);
  });

  it('publishes a clinic address in full, derived rather than supplied', async () => {
    const application = await insertProfessional(attrs(await account()));

    // A clinic is a business address - it is already on a sign outside.
    expect(application.clinicAddress).toBe('12 Mabini Street, Cebu City, Cebu');
  });

  it('publishes a home-only applicant as a city, never a doorstep', async () => {
    const application = await insertProfessional(
      attrs(await account(), {
        clinicName: null,
        addresses: [
          {
            kind: 'home',
            line1: '44 Acacia Lane',
            city: 'Mandaue',
            province: 'Cebu',
            fix: {
              latitude: 10.3237,
              longitude: 123.9223,
              accuracyMeters: 12,
              capturedAt: '2026-08-27T01:00:00.000Z',
            },
          },
        ],
      })
    );

    expect(application.clinicAddress).toBe('Mandaue, Cebu');
    // The street is still on file: a reviewer needs it, and it is the published
    // line that stops at the city.
    expect(application.addresses[0].line1).toBe('44 Acacia Lane');
    expect(application.addresses[0].postalCode).toBeNull();
    // Stored as a date, not the string it arrived as.
    expect(application.addresses[0].fix?.capturedAt).toBeInstanceOf(Date);
  });
});

describe('the review queue', () => {
  it('reads one application per account', async () => {
    const owner = await account();
    const application = await insertProfessional(attrs(owner));

    expect((await findProfessionalByUser(owner._id))?._id).toEqual(application._id);
    expect(await findProfessionalByUser(new ObjectId())).toBeNull();
  });

  it('filters to the applications waiting for a decision', async () => {
    await insertProfessional(attrs(await account()));
    await verified('2026-08-01T00:00:00.000Z');

    const pending = await findProfessionals({ statuses: ['pending'] });
    expect(pending.total).toBe(1);
    expect(pending.items[0].status).toBe('pending');

    // No status filter is the admin view: everything, still paginated.
    expect((await findProfessionals()).total).toBe(2);
  });

  it('pages rather than handing back the whole queue', async () => {
    for (let n = 0; n < 5; n++) await insertProfessional(attrs(await account()));

    const page = await findProfessionals({ page: 2, limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.total).toBe(5);
  });

  it('searches the licence number and the name on it', async () => {
    await insertProfessional(
      attrs(await account(), { fullName: 'Marites Reyes', licenseNumber: 'VET-9001' })
    );
    await insertProfessional(attrs(await account(), { fullName: 'Ben Cruz' }));

    // The name a reviewer has in front of them is the one on the licence, so the
    // queue search reaches it without joining the accounts first.
    expect((await findProfessionals({ q: 'reyes' })).total).toBe(1);
    expect((await findProfessionals({ q: 'VET-9001' })).total).toBe(1);
    expect((await findProfessionals({ q: 'Bayside' })).total).toBe(2);
    expect((await findProfessionals({ q: 'nobody at all' })).total).toBe(0);
  });
});

describe('the public directory', () => {
  it('joins the account so an entry has a name and a face', async () => {
    const { owner } = await verified('2026-08-01T00:00:00.000Z');

    const page = await findVerifiedProfessionals();
    expect(page.total).toBe(1);
    expect(page.items[0].account).toMatchObject({
      name: owner.name,
      avatarUrl: owner.avatarUrl,
      status: 'active',
    });
    // Projected inside the join, so the hash never leaves the database.
    expect(page.items[0].account).not.toHaveProperty('password');
    expect(page.items[0].account).not.toHaveProperty('email');
  });

  it('lists nobody who has not been verified', async () => {
    await insertProfessional(attrs(await account()));
    await insertProfessional(attrs(await account(), { status: 'rejected' }));
    await insertProfessional(attrs(await account(), { status: 'suspended' }));

    expect((await findVerifiedProfessionals()).total).toBe(0);
  });

  it('drops a verified vet whose account is no longer active', async () => {
    const { owner } = await verified('2026-08-01T00:00:00.000Z');
    await verified('2026-08-02T00:00:00.000Z');

    await updateUser(owner._id, { status: 'banned' });

    const page = await findVerifiedProfessionals();
    // The count comes from the same joined pipeline, so it cannot promise a page
    // of two and then hand back one.
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].user).not.toEqual(owner._id);
  });

  it('drops an application whose account has been deleted outright', async () => {
    const { owner } = await verified('2026-08-01T00:00:00.000Z');
    await usersCollection().deleteOne({ _id: owner._id });

    expect((await findVerifiedProfessionals()).total).toBe(0);
  });

  it('orders the directory by the most recent verification', async () => {
    await verified('2026-06-01T00:00:00.000Z', { clinicName: 'Older Clinic' });
    await verified('2026-08-20T00:00:00.000Z', { clinicName: 'Newer Clinic' });

    const page = await findVerifiedProfessionals();
    expect(page.items.map((one) => one.clinicName)).toEqual(['Newer Clinic', 'Older Clinic']);
  });

  it('filters by specialty', async () => {
    await verified('2026-08-01T00:00:00.000Z', { specialties: ['surgery', 'dentistry'] });
    await verified('2026-08-02T00:00:00.000Z', { specialties: ['dermatology'] });

    const page = await findVerifiedProfessionals({ specialty: 'surgery' });
    expect(page.total).toBe(1);
    expect(page.items[0].specialties).toContain('surgery');
  });

  it('pages the directory', async () => {
    for (let n = 0; n < 4; n++) {
      await verified(`2026-08-0${n + 1}T00:00:00.000Z`);
    }

    const page = await findVerifiedProfessionals({ page: 2, limit: 3 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(4);
  });
});

describe('updateProfessional', () => {
  it('stamps the review date when a decision is made', async () => {
    const owner = await account();
    const application = await insertProfessional(attrs(owner));
    const reviewer = new ObjectId();

    const updated = await updateProfessional(application._id, {
      status: 'verified',
      reviewedBy: reviewer,
    });

    // The directory sorts on this date, so a decision without one would sort as
    // though it had never been reviewed.
    expect(updated?.reviewedAt).toBeInstanceOf(Date);
    expect(updated?.reviewedBy).toEqual(reviewer);
  });

  it('leaves the review date alone when an interview is booked', async () => {
    const application = await insertProfessional(attrs(await account()));
    const when = new Date('2026-09-01T09:00:00.000Z');

    const updated = await updateProfessional(application._id, {
      status: 'interview',
      interviewAt: when,
      interviewNote: 'Video call. Bring the original licence.',
    });

    expect(updated?.status).toBe('interview');
    expect(updated?.interviewAt).toEqual(when);
    // Booking a conversation is not a verdict. A date here would sort an applicant
    // still waiting to be interviewed in among the vets already verified.
    expect(updated?.reviewedAt).toBeNull();
  });

  it('keeps a review date the caller pinned', async () => {
    const application = await insertProfessional(attrs(await account()));
    const when = new Date('2026-01-01T00:00:00.000Z');

    const updated = await updateProfessional(application._id, {
      status: 'verified',
      reviewedAt: when,
    });

    expect(updated?.reviewedAt).toEqual(when);
  });

  it('records why an application was turned down', async () => {
    const application = await insertProfessional(attrs(await account()));

    const updated = await updateProfessional(application._id, {
      status: 'rejected',
      rejectionReason: 'The licence number does not match the board register.',
    });

    expect(updated?.status).toBe('rejected');
    expect(updated?.rejectionReason).toBe('The licence number does not match the board register.');
  });

  it('reports a missing application instead of creating one', async () => {
    expect(await updateProfessional(new ObjectId(), { status: 'verified' })).toBeNull();
    expect(await professionalsCollection().countDocuments()).toBe(0);
  });

  it('leaves an application alone when the patch is empty', async () => {
    const application = await insertProfessional(attrs(await account()));

    const updated = await updateProfessional(application._id, {});
    expect(updated?.updatedAt).toEqual(application.updatedAt);
  });
});

describe('countProfessionalsByStatus', () => {
  it('counts each queue for the admin breakdown', async () => {
    await insertProfessional(attrs(await account()));
    await insertProfessional(attrs(await account()));
    await insertProfessional(attrs(await account(), { status: 'verified' }));

    const counts = await countProfessionalsByStatus();
    expect(counts).toMatchObject({ pending: 2, verified: 1 });
    expect(counts.rejected).toBeUndefined();
  });
});

describe('public shapes', () => {
  it('keeps the verification material out of a directory entry', async () => {
    const { owner } = await verified('2026-08-01T00:00:00.000Z', {
      specialties: ['surgery'],
      fullName: 'Marites Reyes DVM',
    });
    const [joined] = (await findVerifiedProfessionals()).items;

    const entry = toPublicProfessional(joined);

    expect(entry).toMatchObject({
      userId: owner._id.toString(),
      // The name on the licence, not the account's: a badge that says a register
      // was checked should not sit beside a name settings can rewrite.
      name: 'Marites Reyes DVM',
      clinicName: 'Bayside Animal Clinic',
      clinicAddress: '12 Mabini Street, Cebu City, Cebu',
      specialties: ['surgery'],
      verifiedAt: '2026-08-01T00:00:00.000Z',
    });
    expect(entry.name).not.toBe(owner.name);
    // What a reviewer checks is not what a pet owner browses.
    expect(entry).not.toHaveProperty('licenseNumber');
    expect(entry).not.toHaveProperty('credentialUrls');
    expect(entry).not.toHaveProperty('addresses');
    expect(entry).not.toHaveProperty('captures');
    expect(entry).not.toHaveProperty('reviewedBy');
    expect(entry).not.toHaveProperty('rejectionReason');
  });

  it('shows an applicant their own submission and the reason, but not the reviewer', async () => {
    const owner = await account();
    const application = await insertProfessional(attrs(owner, { licenseNumber: 'VET 77' }));
    const rejected = await updateProfessional(application._id, {
      status: 'rejected',
      reviewedBy: new ObjectId(),
      rejectionReason: 'Credential link is a dead page.',
    });

    const own = toOwnProfessional(rejected!, { portrait: 'aaaaaaaaaaaaaaaaaaaaaaaa' });

    expect(own).toMatchObject({
      fullName: application.fullName,
      licenseNumber: 'VET 77',
      credentialUrls: ['https://example.com/licence.pdf'],
      businessPhone: '+63 32 555 0101',
      status: 'rejected',
      rejectionReason: 'Credential link is a dead page.',
      // Ids to fetch one at a time, not three JPEGs inline in a dashboard read.
      captures: { portrait: 'aaaaaaaaaaaaaaaaaaaaaaaa' },
    });
    // In full, unlike the directory entry: this is the applicant's own copy of
    // what they filed.
    expect(own.addresses).toEqual([
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ]);
    expect(own.reviewedAt).toMatch(/^\d{4}-/);
    expect(own).not.toHaveProperty('reviewedBy');
    expect(own).not.toHaveProperty('backgroundCheckConsentAt');
  });

  it('reports at least one page, even with nobody to show', () => {
    expect(toProfessionalPage({ items: [], total: 0, page: 1, limit: 12 })).toMatchObject({
      items: [],
      pages: 1,
    });
  });

  it('rounds a partial last page up', () => {
    expect(toProfessionalPage({ items: [], total: 13, page: 2, limit: 12 }).pages).toBe(2);
  });
});

describe('professional indexes', () => {
  it('lets the database enforce one application per account', async () => {
    const indexes = await professionalsCollection().indexes();
    const user = indexes.find((index) => index.name === 'user_1');

    expect(user?.unique).toBe(true);
  });

  it('indexes the queue, the directory, the licence pair, and the specialty filter', async () => {
    const names = (await professionalsCollection().indexes()).map((index) => index.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'status_1_createdAt_-1',
        'status_1_reviewedAt_-1',
        'licenseAuthority_1_licenseNumber_1',
        'specialties_1',
      ])
    );
  });

  it('keeps applications forever — no TTL', async () => {
    const indexes = await professionalsCollection().indexes();

    // A rejected applicant may appeal, and a suspension has to stay explainable.
    expect(indexes.every((index) => index.expireAfterSeconds === undefined)).toBe(true);
  });
});
