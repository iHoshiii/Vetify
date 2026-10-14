import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { appointmentsCollection, findAppointmentById } from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { decideAppointment } from '../appointments.service';
import { scanCompletions } from '../appointment-completion.service';
import { scanAppointmentDeliveries } from '../appointment-deliveries.service';
import * as mail from '../mail.service';
import * as notifications from '../notifications.service';
import { confirmedBooking, makeReviewDeliveryDue } from './appointment-review-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  mail.clearRecentMail();
  await clearTestDb();
});
afterAll(stopTestDb);

it('sends an onsite review prompt when marked done and does not repeat it in automatic scans', async () => {
  const fixture = await confirmedBooking();
  mail.clearRecentMail();
  const completed = await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  expect(completed?.appointment.reviewPromptSentAt).toBeInstanceOf(Date);
  expect(completed?.mail?.delivered).toBe(true);
  expect(mail.recentMail()).toHaveLength(1);
  expect(mail.recentMail()[0].to).toBe(fixture.owner.email);
  await scanCompletions();
  await scanAppointmentDeliveries();
  expect(mail.recentMail()).toHaveLength(1);
  expect(await notifications.countUnread(fixture.owner._id)).toBe(2);
});

it('keeps manual completion successful and retries its review email after provider failure', async () => {
  const fixture = await confirmedBooking();
  const sender = vi.spyOn(mail, 'deliverMail').mockResolvedValueOnce({
    delivered: false,
    deliveryError: 'Provider unavailable',
  });
  const completed = await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  expect(completed?.appointment.status).toBe('completed');
  expect((await findAppointmentById(fixture.booking._id))?.deliveries?.[0]).toMatchObject({
    action: 'review',
    notificationPending: false,
    mailPending: true,
  });
  await makeReviewDeliveryDue(fixture.booking._id);
  await Promise.all([scanAppointmentDeliveries(), scanAppointmentDeliveries()]);
  expect(sender).toHaveBeenCalledTimes(2);
  expect(sender.mock.calls[0][0]).toEqual(sender.mock.calls[1][0]);
  expect(await notifications.countUnread(fixture.owner._id)).toBe(2);
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});

it('does not invite a review for a virtual booking nobody attended', async () => {
  const fixture = await confirmedBooking('virtual');
  mail.clearRecentMail();
  await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  expect((await findAppointmentById(fixture.booking._id))?.reviewPromptSentAt).toBeNull();
  expect(mail.recentMail()).toHaveLength(0);
});

it('invites a review after an attended virtual consultation is marked done', async () => {
  const fixture = await confirmedBooking('virtual');
  await appointmentsCollection().updateOne(
    { _id: fixture.booking._id },
    { $set: { consultedAt: new Date() } }
  );
  mail.clearRecentMail();
  await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  expect((await findAppointmentById(fixture.booking._id))?.reviewPromptSentAt).toBeInstanceOf(Date);
  expect(mail.recentMail()).toHaveLength(1);
});

it('discards a queued review invitation if the owner has already rated the visit', async () => {
  const fixture = await confirmedBooking();
  vi.spyOn(mail, 'deliverMail').mockResolvedValueOnce({
    delivered: false,
    deliveryError: 'Provider unavailable',
  });
  await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  await appointmentsCollection().updateOne({ _id: fixture.booking._id }, { $set: { rating: 5 } });
  mail.clearRecentMail();
  await makeReviewDeliveryDue(fixture.booking._id);
  await scanAppointmentDeliveries();
  expect(mail.recentMail()).toHaveLength(0);
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});

it('waits for the no-show grace before delivering a manually completed virtual review invitation', async () => {
  const fixture = await confirmedBooking('virtual');
  const startsAt = new Date(Date.now() - 5 * 60_000);
  await appointmentsCollection().updateOne(
    { _id: fixture.booking._id },
    { $set: { startsAt, clientJoinedAt: new Date() } }
  );
  mail.clearRecentMail();
  await decideAppointment({
    id: fixture.booking._id,
    decision: 'completed',
    professional: fixture.vet,
  });
  const task = (await findAppointmentById(fixture.booking._id))!.deliveries![0];
  expect(task.availableAt.getTime()).toBeGreaterThan(Date.now());
  expect(await notifications.countUnread(fixture.owner._id)).toBe(1);
  expect(mail.recentMail()).toHaveLength(0);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(task.availableAt.getTime() + 1);
  await scanAppointmentDeliveries();
  expect(mail.recentMail()).toHaveLength(1);
  expect(await notifications.countUnread(fixture.owner._id)).toBe(2);
  expect((await findAppointmentById(fixture.booking._id))?.deliveries).toEqual([]);
});
