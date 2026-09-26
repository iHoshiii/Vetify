import { APPOINTMENT_SLOT_MINUTES } from '@shared/limits';
import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  appointmentsCollection,
  auditLogsCollection,
  findAppointmentById,
  findProfessionalById,
  insertProfessional,
  insertUser,
  reviewReportsCollection,
  setProfessionalRating,
  updateProfessional,
  type AppointmentDocument,
  type User,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { decideReviewReport, reportReview } from '../review-reports.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

async function account(name: string): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `${name}${seq}@example.com`,
    password: 'pw12345678',
    name: `${name} ${seq}`,
  });
}

// A verified vet with a professional document the recompute can write its average back to.
async function vet() {
  const user = await account('vet');
  seq += 1;
  const application = await insertProfessional({
    user: user._id,
    fullName: `Marites Reyes ${seq}`,
    licenseNumber: `PRC-${900000 + seq}`,
    licenseAuthority: 'Professional Regulation Commission',
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
  });
  return {
    user,
    application: (await updateProfessional(application._id, { status: 'verified' }))!,
  };
}

// A completed, rated booking written straight into the collection, so the report path is exercised without the slot-grid fixtures.
async function seedRated(input: {
  professional: ObjectId;
  professionalUser: ObjectId;
  client: ObjectId;
  rating: number | null;
  comment?: string | null;
}): Promise<ObjectId> {
  const when = new Date();
  const doc: AppointmentDocument = {
    _id: new ObjectId(),
    professional: input.professional,
    professionalUser: input.professionalUser,
    client: input.client,
    kind: 'onsite',
    startsAt: when,
    minutes: APPOINTMENT_SLOT_MINUTES,
    heldSlots: [when],
    status: 'completed',
    holdsSlot: true,
    petName: null,
    petSpecies: 'Dog',
    petBreed: null,
    petAge: null,
    reason: 'A checkup.',
    phone: null,
    clientEmail: null,
    meetingUrl: null,
    refusalReason: null,
    cancelledBy: null,
    decidedAt: when,
    reminderSentAt: null,
    reviewPromptSentAt: null,
    joinedAt: null,
    consultedAt: null,
    clientJoinedAt: null,
    rating: input.rating,
    ratingComment: input.comment ?? null,
    ratedAt: when,
    reviewReply: null,
    reviewReplyAt: null,
    createdAt: when,
    updatedAt: when,
  };
  await appointmentsCollection().insertOne(doc);
  return doc._id;
}

describe('reportReview', () => {
  it('files a pending report keyed to the reported booking', async () => {
    const { application, user: vetUser } = await vet();
    const reporter = await account('owner');
    const id = await seedRated({
      professional: application._id,
      professionalUser: vetUser._id,
      client: new ObjectId(),
      rating: 5,
    });

    const report = await reportReview({
      appointmentId: id,
      reporter: reporter._id,
      reason: 'Fake review from a competitor',
    });

    expect(report?.status).toBe('pending');
    expect(report?.appointment.equals(id)).toBe(true);
    expect(report?.professional.equals(application._id)).toBe(true);
    expect(await reviewReportsCollection().countDocuments({ status: 'pending' })).toBe(1);
  });

  it('answers null for a booking that was never rated', async () => {
    const { application, user: vetUser } = await vet();
    const reporter = await account('owner');
    const id = await seedRated({
      professional: application._id,
      professionalUser: vetUser._id,
      client: new ObjectId(),
      rating: null,
    });

    await expect(
      reportReview({ appointmentId: id, reporter: reporter._id, reason: 'Nothing here' })
    ).resolves.toBeNull();
  });
});

describe('decideReviewReport', () => {
  async function reported(rating: number, comment: string | null = null) {
    const { application, user: vetUser } = await vet();
    const reporter = await account('owner');
    const id = await seedRated({
      professional: application._id,
      professionalUser: vetUser._id,
      client: new ObjectId(),
      rating,
      comment,
    });
    const report = await reportReview({
      appointmentId: id,
      reporter: reporter._id,
      reason: 'Abusive language',
    });
    return { application, admin: await account('admin'), appointmentId: id, reportId: report!._id };
  }

  it('removes the review, recomputes the average, and writes an audit entry', async () => {
    const { application, admin, appointmentId, reportId } = await reported(5, 'Not a real visit');
    // A second rated booking survives the removal, so the recompute has something to average to.
    await seedRated({
      professional: application._id,
      professionalUser: new ObjectId(),
      client: new ObjectId(),
      rating: 3,
    });
    await setProfessionalRating(application._id, { average: 4, count: 2 });

    const decided = await decideReviewReport({
      id: reportId,
      reviewer: admin,
      action: 'remove',
      reason: 'Confirmed fake review',
    });

    expect(decided?.status).toBe('reviewed');
    expect((await findAppointmentById(appointmentId))?.rating).toBeNull();
    const vetNow = await findProfessionalById(application._id);
    expect(vetNow?.ratingAverage).toBe(3);
    expect(vetNow?.ratingCount).toBe(1);
    const entry = await auditLogsCollection().findOne({ action: 'review.removed' });
    expect(entry?.targetId?.equals(appointmentId)).toBe(true);
  });

  it('dismisses without touching the review, and records it', async () => {
    const { admin, appointmentId, reportId } = await reported(5);

    const decided = await decideReviewReport({ id: reportId, reviewer: admin, action: 'dismiss' });

    expect(decided?.status).toBe('dismissed');
    expect((await findAppointmentById(appointmentId))?.rating).toBe(5);
    expect(await auditLogsCollection().countDocuments({ action: 'review.dismissed' })).toBe(1);
  });

  it('insists on a reason before removing', async () => {
    const { admin, reportId } = await reported(2);

    await expect(
      decideReviewReport({ id: reportId, reviewer: admin, action: 'remove' })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('refuses to decide the same report twice', async () => {
    const { admin, reportId } = await reported(1);
    await decideReviewReport({ id: reportId, reviewer: admin, action: 'dismiss' });

    await expect(
      decideReviewReport({ id: reportId, reviewer: admin, action: 'dismiss' })
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('answers null for a report that does not exist', async () => {
    const admin = await account('admin');

    await expect(
      decideReviewReport({ id: new ObjectId(), reviewer: admin, action: 'dismiss' })
    ).resolves.toBeNull();
  });
});
