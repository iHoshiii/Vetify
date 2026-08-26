import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  auditLogsCollection,
  findProfessionalById,
  findUserById,
  findVerifiedProfessionals,
  insertProfessional,
  insertUser,
  type ProfessionalAttrs,
  type User,
  type UserRole,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { reviewProfessional } from '../professionals.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

async function account(role: UserRole = 'user'): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `${role}${seq}@example.com`,
    password: 'pw12345678',
    name: `Dr Vet ${seq}`,
    role,
  });
}

async function application(user: User, overrides: Partial<ProfessionalAttrs> = {}) {
  seq += 1;
  return await insertProfessional({
    user: user._id,
    fullName: `Marites Reyes ${seq}`,
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
    bio: 'Small animal practice, fifteen years of it.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
    ...overrides,
  });
}

describe('reviewProfessional', () => {
  it('verifies the licence, promotes the applicant, and records the decision', async () => {
    const applicant = await account();
    const admin = await account('admin');
    const filed = await application(applicant);

    const result = await reviewProfessional({
      id: filed._id,
      decision: 'verified',
      reviewer: admin,
      ip: '203.0.113.4',
    });

    expect(result?.application.status).toBe('verified');
    expect(result?.application.reviewedBy).toEqual(admin._id);
    expect(result).toMatchObject({ roleFrom: 'user', roleTo: 'professional' });
    // A verified application without the role is a vet who cannot post, which is
    // why the two moves live in one place.
    expect((await findUserById(applicant._id))?.role).toBe('professional');

    const entry = await auditLogsCollection().findOne({});
    expect(entry).toMatchObject({
      action: 'professional.verified',
      targetType: 'professional',
      targetId: filed._id,
      actor: admin._id,
      actorEmail: admin.email,
      ip: '203.0.113.4',
      metadata: {
        applicantId: applicant._id.toString(),
        applicantEmail: applicant.email,
        licenseNumber: filed.licenseNumber,
        roleFrom: 'user',
        roleTo: 'professional',
      },
    });
  });

  it('sends a rejected applicant back to being a user, with the reason kept', async () => {
    const applicant = await account('professional');
    const admin = await account('admin');
    const filed = await application(applicant, { status: 'verified' });

    const result = await reviewProfessional({
      id: filed._id,
      decision: 'rejected',
      reviewer: admin,
      reason: 'The licence number does not match the board register.',
    });

    expect(result).toMatchObject({ roleFrom: 'professional', roleTo: 'user' });
    expect(result?.application.rejectionReason).toBe(
      'The licence number does not match the board register.'
    );
    expect((await findUserById(applicant._id))?.role).toBe('user');
    expect((await auditLogsCollection().findOne({}))?.action).toBe('professional.rejected');
  });

  it('refuses to turn someone down without saying why', async () => {
    const applicant = await account();
    const admin = await account('admin');
    const filed = await application(applicant);

    await expect(
      reviewProfessional({ id: filed._id, decision: 'rejected', reviewer: admin, reason: '   ' })
    ).rejects.toMatchObject({ statusCode: 400 });

    // The refusal happens before anything is written.
    expect((await findProfessionalById(filed._id))?.status).toBe('pending');
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });

  it('refuses a reviewer who is reviewing their own application', async () => {
    const admin = await account('admin');
    const filed = await application(admin);

    await expect(
      reviewProfessional({ id: filed._id, decision: 'verified', reviewer: admin })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect((await findProfessionalById(filed._id))?.status).toBe('pending');
    expect((await findUserById(admin._id))?.role).toBe('admin');
  });

  it('leaves an admin an admin, whichever way the verdict goes', async () => {
    const applicant = await account('admin');
    const reviewer = await account('admin');
    const filed = await application(applicant);

    const verdict = await reviewProfessional({
      id: filed._id,
      decision: 'verified',
      reviewer,
    });

    // A vet application is a claim about a licence, not about who runs the
    // dashboard. Promoting to 'professional' here would be a demotion.
    expect(verdict).toMatchObject({ roleFrom: 'admin', roleTo: 'admin' });
    expect((await findUserById(applicant._id))?.role).toBe('admin');

    await reviewProfessional({
      id: filed._id,
      decision: 'suspended',
      reviewer,
      reason: 'Listing pulled while the board review is open.',
    });

    expect((await findUserById(applicant._id))?.role).toBe('admin');
  });

  it('takes a suspended vet out of the directory', async () => {
    const applicant = await account();
    const admin = await account('admin');
    const filed = await application(applicant);

    await reviewProfessional({ id: filed._id, decision: 'verified', reviewer: admin });
    expect((await findVerifiedProfessionals()).total).toBe(1);

    await reviewProfessional({
      id: filed._id,
      decision: 'suspended',
      reviewer: admin,
      reason: 'Complaint under investigation by the board.',
    });

    expect((await findVerifiedProfessionals()).total).toBe(0);
    expect((await findUserById(applicant._id))?.role).toBe('user');
  });

  it('reports a missing application instead of auditing a decision about nothing', async () => {
    const admin = await account('admin');

    expect(
      await reviewProfessional({ id: new ObjectId(), decision: 'verified', reviewer: admin })
    ).toBeNull();
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });
});
