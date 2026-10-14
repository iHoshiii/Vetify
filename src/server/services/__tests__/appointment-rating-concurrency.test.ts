import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { findAppointmentById, findProfessionalById } from '../../models';
import * as ratingWrites from '../../models/appointments/rating-writes';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { decideAppointment, rateAppointment, requestAppointment } from '../appointments.service';
import { clearRecentMail } from '../mail.service';
import { completedBooking } from './appointment-review-fixtures';
import { decideReviewReport, reportReview } from '../review-reports.service';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  clearRecentMail();
  await clearTestDb();
});
afterAll(stopTestDb);

it('recomputes an older summary when a concurrent rating has already published a newer one', async () => {
  const fixture = await completedBooking();
  const second = (await requestAppointment({
    ...fixture.input,
    startsAt: new Date(fixture.startsAt.getTime() + 3_600_000),
  }))!.appointment;
  for (const decision of ['confirmed', 'completed'] as const) {
    await decideAppointment({ id: second._id, decision, professional: fixture.vet });
  }
  let resume!: () => void;
  let ready!: () => void;
  const stalled = new Promise<void>((resolve) => (resume = resolve));
  const aggregated = new Promise<void>((resolve) => (ready = resolve));
  const aggregate = ratingWrites.averageRatingForProfessional;
  vi.spyOn(ratingWrites, 'averageRatingForProfessional').mockImplementationOnce(async (id) => {
    const oldSummary = await aggregate(id);
    ready();
    await stalled;
    return oldSummary;
  });
  const first = rateAppointment({ id: fixture.booking._id, actor: fixture.owner, rating: 5 });
  await aggregated;
  try {
    await rateAppointment({ id: second._id, actor: fixture.owner, rating: 1 });
    expect(await findProfessionalById(fixture.professional._id)).toMatchObject({
      ratingAverage: 3,
      ratingCount: 2,
    });
  } finally {
    resume();
  }
  await first;
  expect(await findProfessionalById(fixture.professional._id)).toMatchObject({
    ratingAverage: 3,
    ratingCount: 2,
  });
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
  expect((await findAppointmentById(second._id))?.deliveries).toEqual([]);
});

it('cannot restore a removed review through a delayed rating summary', async () => {
  const fixture = await completedBooking();
  let resume!: () => void;
  let ready!: () => void;
  const stalled = new Promise<void>((resolve) => (resume = resolve));
  const aggregated = new Promise<void>((resolve) => (ready = resolve));
  const aggregate = ratingWrites.averageRatingForProfessional;
  vi.spyOn(ratingWrites, 'averageRatingForProfessional').mockImplementationOnce(async (id) => {
    const oldSummary = await aggregate(id);
    ready();
    await stalled;
    return oldSummary;
  });
  const first = rateAppointment({ id: fixture.booking._id, actor: fixture.owner, rating: 5 });
  await aggregated;
  try {
    const report = (await reportReview({
      appointmentId: fixture.booking._id,
      reporter: fixture.vet._id,
      reason: 'Abusive review',
    }))!;
    await decideReviewReport({
      id: report._id,
      reviewer: fixture.vet,
      action: 'remove',
      reason: 'Abusive review removed',
    });
  } finally {
    resume();
  }
  await first;
  expect(await findProfessionalById(fixture.professional._id)).toMatchObject({
    ratingAverage: 0,
    ratingCount: 0,
  });
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});
