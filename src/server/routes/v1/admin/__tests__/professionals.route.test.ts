import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app';
import { auditLogsCollection } from '../../../../models/audit-log';
import {
  insertProfessional,
  updateProfessional,
  type ProfessionalAttrs,
  type ProfessionalDocument,
} from '../../../../models/professionals';
import { findUserById, insertUser, type UserRole } from '../../../../models/users';
import { signAccessToken } from '../../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

/** An account of the given role, plus a token that says so. */
async function account(role: UserRole = 'user', name?: string) {
  seq += 1;
  const email = `vet${seq}@example.com`;
  const user = await insertUser({
    email,
    password: 'Sup3rSecret!',
    name: name ?? `Dr Vet ${seq}`,
    provider: 'local',
    role,
  });

  return {
    user,
    email,
    token: signAccessToken({ sub: user._id.toString(), email, role }),
  };
}

/** An application on file, pending unless the overrides say otherwise. */
async function filed(user: ObjectId, overrides: Partial<ProfessionalAttrs> = {}) {
  seq += 1;
  return await insertProfessional({
    user,
    licenseNumber: `SEED-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['surgery'],
    clinicName: 'Seed Veterinary',
    clinicAddress: '9 Rizal Avenue, Cebu City',
    bio: 'A practice long enough established to have a listing worth reading.',
    yearsExperience: 8,
    backgroundCheckConsent: true,
    ...overrides,
  });
}

/** A vet already through the queue and in the directory. */
async function verified(overrides: Partial<ProfessionalAttrs> = {}) {
  const { user } = await account('professional');
  const application = await filed(user._id, overrides);

  const listing = await updateProfessional(application._id, {
    status: 'verified',
    reviewedBy: new ObjectId(),
    reviewedAt: new Date(),
  });

  return { user, application: listing as ProfessionalDocument };
}

const REASON = 'The licence number does not match the register for that authority.';

function auditRows() {
  return auditLogsCollection().find({}).sort({ createdAt: 1 }).toArray();
}

describe('GET /api/v1/admin/professionals', () => {
  it('turns away a caller with no token', async () => {
    const res = await request(app).get('/api/v1/admin/professionals');

    expect(res.status).toBe(401);
  });

  it('turns away a verified vet, who is not a reviewer', async () => {
    const { token } = await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/professionals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('opens on the pending queue and leaves decided applications out of it', async () => {
    const { token } = await account('admin');
    const applicant = await account();
    await filed(applicant.user._id, { clinicName: 'Waiting Room Veterinary' });
    await verified({ clinicName: 'Already Listed Veterinary' });

    const res = await request(app)
      .get('/api/v1/admin/professionals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].clinicName).toBe('Waiting Room Veterinary');
    expect(res.body).toMatchObject({ page: 1, total: 1, pages: 1 });
  });

  it('names the applicant and their standing, without their password', async () => {
    const { token } = await account('admin');
    const applicant = await account('user', 'Grace Hopper');
    await filed(applicant.user._id);

    const res = await request(app)
      .get('/api/v1/admin/professionals')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.items[0].applicant).toMatchObject({
      email: applicant.email,
      name: 'Grace Hopper',
      role: 'user',
      status: 'active',
    });
    expect(res.body.items[0].applicant).not.toHaveProperty('password');
    // The licence material is exactly what this screen is for, unlike the
    // public directory.
    expect(res.body.items[0].licenseNumber).toBeTruthy();
  });

  it('lists a decided application when asked for that status', async () => {
    const { token } = await account('admin');
    await verified({ clinicName: 'Already Listed Veterinary' });

    const res = await request(app)
      .get('/api/v1/admin/professionals?status=verified')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].status).toBe('verified');
  });

  it('refuses a page size above the cap', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/professionals?limit=100000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('searches the licence number and the clinic name', async () => {
    const { token } = await account('admin');
    const one = await account();
    const two = await account();
    await filed(one.user._id, { licenseNumber: 'PRC-99123', clinicName: 'Northside Animal Care' });
    await filed(two.user._id, { licenseNumber: 'PRC-40001', clinicName: 'Bayside Veterinary' });

    const byLicense = await request(app)
      .get('/api/v1/admin/professionals?q=99123')
      .set('Authorization', `Bearer ${token}`);
    expect(byLicense.body.items.map((i: { clinicName: string }) => i.clinicName)).toEqual([
      'Northside Animal Care',
    ]);

    const byClinic = await request(app)
      .get('/api/v1/admin/professionals?q=bayside')
      .set('Authorization', `Bearer ${token}`);
    expect(byClinic.body.items.map((i: { clinicName: string }) => i.clinicName)).toEqual([
      'Bayside Veterinary',
    ]);
  });

  it('treats a search term as text, not as a pattern', async () => {
    const { token } = await account('admin');
    const applicant = await account();
    await filed(applicant.user._id);

    const res = await request(app)
      .get('/api/v1/admin/professionals?q=.%2A')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

describe('GET /api/v1/admin/professionals/:id', () => {
  it('returns one application in full', async () => {
    const { token } = await account('admin');
    const applicant = await account();
    const application = await filed(applicant.user._id, { clinicName: 'Detail Veterinary' });

    const res = await request(app)
      .get(`/api/v1/admin/professionals/${application._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: application._id.toString(),
      clinicName: 'Detail Veterinary',
      status: 'pending',
    });
    expect(res.body.applicant.email).toBe(applicant.email);
  });

  it('answers 404 for a malformed id rather than throwing', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/professionals/not-an-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('answers 404 for an application that does not exist', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get(`/api/v1/admin/professionals/${new ObjectId().toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/admin/professionals/:id/verify', () => {
  it('promotes the applicant and records the decision', async () => {
    const admin = await account('admin');
    const applicant = await account();
    const application = await filed(applicant.user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/verify`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ roleFrom: 'user', roleTo: 'professional' });
    expect(res.body.application).toMatchObject({ status: 'verified', rejectionReason: null });
    expect(res.body.application.reviewedAt).toBeTruthy();
    // The role is read back from the database rather than from the response:
    // a verified application whose applicant still cannot post is the bug.
    const stored = await findUserById(applicant.user._id);
    expect(stored?.role).toBe('professional');

    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'professional.verified',
      targetType: 'professional',
      actorEmail: admin.email,
    });
    expect(rows[0].metadata).toMatchObject({
      applicantEmail: applicant.email,
      roleFrom: 'user',
      roleTo: 'professional',
    });
  });

  it('leaves an admin who is also a vet an admin', async () => {
    const reviewer = await account('admin');
    const applicant = await account('admin');
    const application = await filed(applicant.user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/verify`)
      .set('Authorization', `Bearer ${reviewer.token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ roleFrom: 'admin', roleTo: 'admin' });
    const stored = await findUserById(applicant.user._id);
    expect(stored?.role).toBe('admin');
  });

  it('refuses a reviewer approving their own application', async () => {
    const admin = await account('admin');
    const application = await filed(admin.user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/verify`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(403);
    expect(await auditRows()).toHaveLength(0);
  });

  it('answers 404 for an application that does not exist', async () => {
    const admin = await account('admin');

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${new ObjectId().toString()}/verify`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/admin/professionals/:id/reject', () => {
  it('refuses a rejection with no reason, and records nothing', async () => {
    const admin = await account('admin');
    const applicant = await account();
    const application = await filed(applicant.user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(await auditRows()).toHaveLength(0);
  });

  it('refuses a reason too short to explain anything', async () => {
    const admin = await account('admin');
    const applicant = await account();
    const application = await filed(applicant.user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: 'no' });

    expect(res.status).toBe(400);
  });

  it('turns the application down and tells the applicant why', async () => {
    const admin = await account('admin');
    const applicant = await account();
    const application = await filed(applicant.user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: REASON });

    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({ status: 'rejected', rejectionReason: REASON });

    const rows = await auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'professional.rejected', reason: REASON });
  });

  it('drops the role a verified vet was given', async () => {
    const admin = await account('admin');
    const { user, application } = await verified();

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/reject`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: REASON });

    expect(res.body).toMatchObject({ roleFrom: 'professional', roleTo: 'user' });
    const stored = await findUserById(user._id);
    expect(stored?.role).toBe('user');
  });
});

describe('PATCH /api/v1/admin/professionals/:id/suspend', () => {
  it('pulls the listing and the role, and leaves the directory', async () => {
    const admin = await account('admin');
    const { user, application } = await verified({ clinicName: 'Suspended Veterinary' });

    const before = await request(app).get('/api/v1/professionals');
    expect(before.body.total).toBe(1);

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/suspend`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: REASON });

    expect(res.status).toBe(200);
    expect(res.body.application).toMatchObject({ status: 'suspended', rejectionReason: REASON });
    expect(await findUserById(user._id).then((u) => u?.role)).toBe('user');

    const after = await request(app).get('/api/v1/professionals');
    expect(after.body.total).toBe(0);

    const rows = await auditRows();
    expect(rows.map((row) => row.action)).toEqual(['professional.suspended']);
  });

  it('refuses a suspension with no reason', async () => {
    const admin = await account('admin');
    const { application } = await verified();

    const res = await request(app)
      .patch(`/api/v1/admin/professionals/${application._id.toString()}/suspend`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(await auditRows()).toHaveLength(0);
  });

  it('answers 404 for a malformed id', async () => {
    const admin = await account('admin');

    const res = await request(app)
      .patch('/api/v1/admin/professionals/not-an-id/suspend')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: REASON });

    expect(res.status).toBe(404);
  });
});
