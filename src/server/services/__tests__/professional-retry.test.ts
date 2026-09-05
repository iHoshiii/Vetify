import { PROFESSIONAL_RETRY_DAYS } from '@shared/limits';
import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  findProfessionalByUser,
  insertProfessional,
  insertProfessionalCaptures,
  insertProfessionalInquiry,
  insertUser,
  professionalCapturesCollection,
  professionalInquiriesCollection,
  professionalsCollection,
  updateProfessionalInquiry,
  type ProfessionalInquiryAttrs,
  type ProfessionalStatus,
  type User,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { dropStaleRefusal, inquiryBlock } from '../professional-retry.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;
const DAY = 24 * 60 * 60 * 1000;

// Far enough back that the cooling-off period has run, whichever date it is measured from
function longAgo(): Date {
  return new Date(Date.now() - (PROFESSIONAL_RETRY_DAYS + 1) * DAY);
}

async function account(): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `vet${seq}@example.com`,
    password: 'pw12345678',
    name: `Dr Vet ${seq}`,
  });
}

async function enquiry(user: User, overrides: Partial<ProfessionalInquiryAttrs> = {}) {
  return await insertProfessionalInquiry({
    name: 'Marites Reyes',
    email: user.email,
    licenseNumber: `VET-${(seq += 1)}`,
    currentLocation: 'Cebu City, Cebu',
    clinicLocation: 'Mandaue, Cebu',
    motivation: 'Fifteen years of small animal practice and nowhere to write it down.',
    ...overrides,
  });
}

async function application(user: User, status: ProfessionalStatus, reviewedAt: Date | null = null) {
  const filed = await insertProfessional({
    user: user._id,
    fullName: 'Marites Reyes',
    licenseNumber: `VET-${(seq += 1)}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
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
  });

  await professionalsCollection().updateOne(
    { _id: filed._id },
    { $set: { status, reviewedAt, reviewedBy: new ObjectId() } }
  );
  return filed;
}

async function photographs(application: ObjectId, user: ObjectId) {
  return await insertProfessionalCaptures({
    application,
    user,
    captures: (['portrait', 'licenseFront', 'licenseBack'] as const).map((kind) => ({
      kind,
      data: 'Zm9yLXRlc3RzLW9uZS1qcGVnLXBsZWFzZQ==',
      mimeType: 'image/jpeg',
      capturedAt: new Date(),
    })),
  });
}

describe('inquiryBlock', () => {
  it('turns away an account whose application is still with the reviewers', async () => {
    const user = await account();
    await application(user, 'pending');

    await expect(inquiryBlock({ user: user._id, email: user.email })).resolves.toMatchObject({
      code: 'application-filed',
    });
  });

  it('names the date a refused applicant may try again', async () => {
    const user = await account();
    await application(user, 'rejected', new Date());

    const block = await inquiryBlock({ user: user._id, email: user.email });
    expect(block?.code).toBe('application-rejected');
    expect(block?.message).toMatch(/You can apply again from/);
  });

  it('lets a refusal older than the period through', async () => {
    const user = await account();
    await application(user, 'rejected', longAgo());

    await expect(inquiryBlock({ user: user._id, email: user.email })).resolves.toBeNull();
  });

  it('holds an address a reviewer declined inside the period', async () => {
    const user = await account();
    const sent = await enquiry(user);
    await updateProfessionalInquiry(sent._id, {
      status: 'declined',
      openEmail: null,
      reviewedBy: new ObjectId(),
      reviewedAt: new Date(),
    });

    const block = await inquiryBlock({ user: user._id, email: user.email });
    expect(block?.code).toBe('inquiry-cooldown');
    expect(block?.message).toMatch(/You can send another from/);
  });

  it('does not hold an address the screen declined on its own', async () => {
    const user = await account();
    const sent = await enquiry(user);
    await updateProfessionalInquiry(sent._id, {
      status: 'declined',
      openEmail: null,
      declineReason: 'Automatic: the licence number is not one this authority issues.',
    });

    await expect(inquiryBlock({ user: user._id, email: user.email })).resolves.toBeNull();
  });

  it('leaves an enquiry still waiting to the unique index', async () => {
    const user = await account();
    await enquiry(user);

    await expect(inquiryBlock({ user: user._id, email: user.email })).resolves.toBeNull();
  });

  it('closes an enquiry whose link ran out, which frees the address', async () => {
    const user = await account();
    const sent = await enquiry(user);
    await updateProfessionalInquiry(sent._id, {
      status: 'invited',
      inviteExpiresAt: new Date(Date.now() - DAY),
    });

    await expect(inquiryBlock({ user: user._id, email: user.email })).resolves.toBeNull();

    const after = await professionalInquiriesCollection().findOne({ _id: sent._id });
    expect(after?.openEmail).toBeNull();
    expect(after?.status).toBe('invited');
  });
});

describe('dropStaleRefusal', () => {
  it('clears a stale refusal and its photographs out of the way', async () => {
    const user = await account();
    const refused = await application(user, 'rejected', longAgo());
    await photographs(refused._id, user._id);

    await expect(dropStaleRefusal(user._id)).resolves.toBe(true);
    expect(await findProfessionalByUser(user._id)).toBeNull();
    expect(await professionalCapturesCollection().countDocuments()).toBe(0);
  });

  it('leaves a fresh refusal and a live application alone', async () => {
    const refused = await account();
    await application(refused, 'rejected', new Date());
    const verified = await account();
    await application(verified, 'verified', longAgo());

    await expect(dropStaleRefusal(refused._id)).resolves.toBe(false);
    await expect(dropStaleRefusal(verified._id)).resolves.toBe(false);
    expect(await professionalsCollection().countDocuments()).toBe(2);
  });
});
