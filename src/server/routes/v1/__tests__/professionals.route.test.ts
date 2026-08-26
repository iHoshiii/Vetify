import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { activityEventsCollection, flushActivity } from '../../../models/activity-event';
import {
  insertProfessional,
  updateProfessional,
  type ProfessionalAttrs,
} from '../../../models/professionals';
import { insertUser, type UserRole, type UserStatus } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

/**
 * A capture as the camera hands it over: raw base64, JPEG, taken just now.
 *
 * "Just now" is the part that matters. The schema refuses a capture more than two
 * hours old, so a fixture with a fixed timestamp would start failing on its own.
 */
function photo() {
  return {
    data: 'Zm9yLXRlc3RzLW9uZS1qcGVnLXBsZWFzZQ==',
    mimeType: 'image/jpeg',
    capturedAt: new Date().toISOString(),
  };
}

/** A valid application body, as the second form would send it. */
function form(overrides: Record<string, unknown> = {}) {
  seq += 1;
  return {
    fullName: `Marites Reyes ${seq}`,
    licenseNumber: `vet-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['Dentistry', 'dentistry', 'Surgery'],
    clinicName: 'Bayside Animal Clinic',
    businessPhone: '+63 32 555 0101',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
      },
    ],
    portrait: photo(),
    licenseFront: photo(),
    licenseBack: photo(),
    bio: 'Small animal practice for fifteen years, mostly dentistry and soft tissue surgery work.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
    ...overrides,
  };
}

/** An account of the given role and status, plus a token that says so. */
async function account(role: UserRole = 'user', status: UserStatus = 'active') {
  seq += 1;
  const user = await insertUser({
    email: `vet${seq}@example.com`,
    password: 'Sup3rSecret!',
    name: `Dr Vet ${seq}`,
    provider: 'local',
    role,
    status,
  });

  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role }),
  };
}

/** An application already filed, by default pending. */
async function seed(user: ObjectId, overrides: Partial<ProfessionalAttrs> = {}) {
  seq += 1;
  return await insertProfessional({
    user,
    fullName: `Seed Vet ${seq}`,
    licenseNumber: `SEED-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['surgery'],
    clinicName: 'Seed Veterinary',
    addresses: [
      {
        kind: 'clinic',
        line1: '9 Rizal Avenue',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    businessPhone: '+63 32 555 0202',
    bio: 'A practice long enough established to have a listing worth reading.',
    yearsExperience: 8,
    backgroundCheckConsent: true,
    ...overrides,
  });
}

/** A verified vet in the directory, owned by a real active account. */
async function listed(overrides: Partial<ProfessionalAttrs> = {}) {
  const { user } = await account('professional');
  const application = await seed(user._id, overrides);

  return await updateProfessional(application._id, {
    status: 'verified',
    reviewedBy: new ObjectId(),
    reviewedAt: new Date(),
  });
}

describe('GET /api/v1/professionals', () => {
  it('lists verified vets without the licence material a reviewer sees', async () => {
    await listed({ clinicName: 'Listed Veterinary' });
    const pending = await account();
    await seed(pending.user._id, { clinicName: 'Not reviewed yet' });

    const res = await request(app).get('/api/v1/professionals');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Listed Veterinary');
    // The directory is a place to choose a vet, not to audit one.
    expect(res.body.items[0].licenseNumber).toBeUndefined();
    expect(res.body.items[0].credentialUrls).toBeUndefined();
    expect(res.body.items[0].name).toBeTruthy();
    expect(res.body).toMatchObject({ page: 1, total: 1, pages: 1 });
  });

  it('filters by specialty', async () => {
    await listed({ specialties: ['dentistry'], clinicName: 'Teeth first' });
    await listed({ specialties: ['surgery'], clinicName: 'Surgery only' });

    const res = await request(app).get('/api/v1/professionals?specialty=Dentistry');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Teeth first');
  });

  it('refuses an oversized page instead of quietly clamping it', async () => {
    const res = await request(app).get('/api/v1/professionals?limit=100000');

    expect(res.status).toBe(400);
    expect(res.body.issues.limit).toBeTruthy();
  });
});

describe('POST /api/v1/professionals/apply', () => {
  it('turns an anonymous application away', async () => {
    const res = await request(app).post('/api/v1/professionals/apply').send(form());

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('files the application against the signed-in account and logs it', async () => {
    const applicant = await account();

    const res = await request(app)
      .post('/api/v1/professionals/apply')
      .set('Authorization', `Bearer ${applicant.token}`)
      // A payload naming somebody else as the applicant. The schema has no `user`
      // field, so this is dropped rather than honoured.
      .send({ ...form({ licenseNumber: ' vet 9000-ph ' }), user: new ObjectId().toString() });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      userId: applicant.user._id.toString(),
      status: 'pending',
      licenseNumber: 'VET 9000-PH',
      // Deduped and lowercased on the way in, so the directory filter has one
      // spelling to match.
      specialties: ['dentistry', 'surgery'],
    });
    // The verdict trail is not the applicant business beyond the reason given.
    expect(res.body.reviewedBy).toBeUndefined();

    await flushActivity();
    expect(
      await activityEventsCollection().countDocuments({
        type: 'professional.applied',
        user: applicant.user._id,
      })
    ).toBe(1);
  });

  it('refuses an application with no background-check consent', async () => {
    const applicant = await account();

    const res = await request(app)
      .post('/api/v1/professionals/apply')
      .set('Authorization', `Bearer ${applicant.token}`)
      .send(form({ backgroundCheckConsent: false }));

    expect(res.status).toBe(400);
    expect(res.body.issues.backgroundCheckConsent).toBeTruthy();
  });

  it('lets an account apply only once', async () => {
    const applicant = await account();
    await seed(applicant.user._id);

    const res = await request(app)
      .post('/api/v1/professionals/apply')
      .set('Authorization', `Bearer ${applicant.token}`)
      .send(form());

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('already-applied');
  });
});

describe('POST /api/v1/professionals/apply, refusals that are not the payload', () => {
  it('refuses a licence another account has already registered', async () => {
    const first = await account();
    const taken = await seed(first.user._id, { licenseNumber: 'VET 4242-PH' });
    const second = await account();

    const res = await request(app)
      .post('/api/v1/professionals/apply')
      .set('Authorization', `Bearer ${second.token}`)
      .send(form({ licenseNumber: taken.licenseNumber, licenseAuthority: taken.licenseAuthority }));

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('license-registered');
  });

  it('turns away a banned account holding a token minted before the ban', async () => {
    const banned = await account('user', 'banned');

    const res = await request(app)
      .post('/api/v1/professionals/apply')
      .set('Authorization', `Bearer ${banned.token}`)
      .send(form());

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('account-banned');
  });
});

describe('GET /api/v1/professionals/me', () => {
  it('says so plainly when the caller has not applied', async () => {
    const applicant = await account();

    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(404);
    expect(res.body.reason).toBe('no-application');
  });

  it('returns the outcome and the reason for it, but not who decided', async () => {
    const applicant = await account();
    const application = await seed(applicant.user._id);
    await updateProfessional(application._id, {
      status: 'rejected',
      reviewedBy: new ObjectId(),
      rejectionReason: 'The licence number does not match the board register.',
    });

    const res = await request(app)
      .get('/api/v1/professionals/me')
      .set('Authorization', `Bearer ${applicant.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'rejected',
      rejectionReason: 'The licence number does not match the board register.',
    });
    // Stamped by the update even though the caller did not send one.
    expect(res.body.reviewedAt).toBeTruthy();
    expect(res.body.reviewedBy).toBeUndefined();
  });
});
