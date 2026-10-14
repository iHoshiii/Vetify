import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { findAppointmentById, findProfessionalById } from '../../models';
import * as summaries from '../../models/appointments/rating-summary';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { rateAppointment } from '../appointments.service';
import { scanAppointmentDeliveries } from '../appointment-deliveries.service';
import * as notifications from '../notifications.service';
import * as mail from '../mail.service';
import { completedBooking, makeReviewDeliveryDue } from './appointment-review-fixtures';
import { decideReviewReport, reportReview } from '../review-reports.service';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  mail.clearRecentMail();
  await clearTestDb();
});
afterAll(stopTestDb);

it('returns the saved rating and retries a failed summary after a worker restart', async () => {
  const fixture = await completedBooking();
  vi.spyOn(summaries, 'refreshProfessionalRating').mockRejectedValueOnce(
    new Error('Database offline')
  );
  const rated = await rateAppointment({ id: fixture.booking._id, actor: fixture.owner, rating: 4 });
  expect(rated?.rating).toBe(4);
  expect((await findProfessionalById(fixture.professional._id))?.ratingCount ?? 0).toBe(0);
  expect((await findAppointmentById(fixture.booking._id))?.deliveries?.[0]).toMatchObject({
    action: 'rated',
    summaryPending: true,
    notificationPending: false,
  });
  vi.restoreAllMocks();
  await makeReviewDeliveryDue(fixture.booking._id);
  await scanAppointmentDeliveries();
  expect(await findProfessionalById(fixture.professional._id)).toMatchObject({
    ratingAverage: 4,
    ratingCount: 1,
  });
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});

it('retries a failed rating notification without duplicating its summary or sending email', async () => {
  const fixture = await completedBooking();
  const baseline = await notifications.countUnread(fixture.vet._id);
  mail.clearRecentMail();
  const notifier = vi
    .spyOn(notifications, 'createNotification')
    .mockRejectedValueOnce(new Error('Notification store offline'));
  const refresh = vi.spyOn(summaries, 'refreshProfessionalRating');
  expect(
    (await rateAppointment({ id: fixture.booking._id, actor: fixture.owner, rating: 5 }))?.rating
  ).toBe(5);
  expect((await findAppointmentById(fixture.booking._id))?.deliveries?.[0]).toMatchObject({
    summaryPending: false,
    notificationPending: true,
    mailPending: false,
  });
  await makeReviewDeliveryDue(fixture.booking._id);
  await Promise.all([scanAppointmentDeliveries(), scanAppointmentDeliveries()]);
  expect(notifier).toHaveBeenCalledTimes(2);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(await notifications.countUnread(fixture.vet._id)).toBe(baseline + 1);
  expect(mail.recentMail()).toHaveLength(0);
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});

it('does not count a rating twice if a summary update acknowledgement is lost', async () => {
  const fixture = await completedBooking();
  const refresh = summaries.refreshProfessionalRating;
  vi.spyOn(summaries, 'refreshProfessionalRating').mockImplementationOnce(async (id) => {
    await refresh(id);
    throw new Error('Acknowledgement lost');
  });
  await rateAppointment({ id: fixture.booking._id, actor: fixture.owner, rating: 3 });
  await makeReviewDeliveryDue(fixture.booking._id);
  await scanAppointmentDeliveries();
  expect(await findProfessionalById(fixture.professional._id)).toMatchObject({
    ratingAverage: 3,
    ratingCount: 1,
  });
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});

it('recovers a summary after moderation removes a rating while the summary store is unavailable', async () => {
  const fixture = await completedBooking();
  await rateAppointment({ id: fixture.booking._id, actor: fixture.owner, rating: 2 });
  const report = (await reportReview({
    appointmentId: fixture.booking._id,
    reporter: fixture.vet._id,
    reason: 'Abusive review',
  }))!;
  vi.spyOn(summaries, 'refreshProfessionalRating').mockRejectedValueOnce(
    new Error('Database offline')
  );
  const removed = await decideReviewReport({
    id: report._id,
    reviewer: fixture.vet,
    action: 'remove',
    reason: 'Abusive review removed',
  });
  expect(removed?.status).toBe('reviewed');
  expect((await findAppointmentById(fixture.booking._id))?.deliveries?.[0]).toMatchObject({
    action: 'rating_removed',
    summaryPending: true,
  });
  await makeReviewDeliveryDue(fixture.booking._id);
  await scanAppointmentDeliveries();
  expect(await findProfessionalById(fixture.professional._id)).toMatchObject({
    ratingAverage: 0,
    ratingCount: 0,
  });
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});
