import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { appointmentsCollection, findAppointmentById, insertUser } from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { requestAppointment, decideAppointment } from '../appointments.service';
import { scanAppointmentDeliveries } from '../appointment-deliveries.service';
import * as notifications from '../notifications.service';
import * as mail from '../mail.service';
import { bookingFixture } from './appointment-reliability-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  mail.clearRecentMail();
  await clearTestDb();
});
afterAll(stopTestDb);

async function makeDeliveryDue(id: Parameters<typeof findAppointmentById>[0]) {
  const booking = (await findAppointmentById(id))!;
  for (const task of booking.deliveries ?? []) {
    await appointmentsCollection().updateOne(
      { _id: booking._id, 'deliveries.id': task.id },
      {
        $set: { 'deliveries.$.availableAt': new Date(0), 'deliveries.$.leaseUntil': new Date(0) },
      }
    );
  }
}

it('keeps a saved booking successful and retries a failed notification without resending its email', async () => {
  const fixture = await bookingFixture();
  const notify = vi
    .spyOn(notifications, 'createNotification')
    .mockRejectedValueOnce(new Error('Notice store offline'));
  const input = { ...fixture.input, requestId: randomUUID() };
  const first = (await requestAppointment(input))!;
  expect(first.appointment.status).toBe('requested');
  expect(first.mail.professional.delivered).toBe(true);
  expect((await findAppointmentById(first.appointment._id))?.deliveries?.[0]).toMatchObject({
    notificationPending: true,
    mailPending: false,
  });
  const repeated = (await requestAppointment(input))!;
  expect(repeated.appointment._id).toEqual(first.appointment._id);
  expect(await appointmentsCollection().countDocuments()).toBe(1);
  await makeDeliveryDue(first.appointment._id);
  await Promise.all([scanAppointmentDeliveries(), scanAppointmentDeliveries()]);
  expect(notify).toHaveBeenCalledTimes(2);
  expect(await notifications.countUnread(fixture.vet._id)).toBe(1);
  expect(mail.recentMail()).toHaveLength(1);
  expect((await findAppointmentById(first.appointment._id))?.deliveries).toEqual([]);
});

it('handles simultaneous repeated booking requests using one saved booking', async () => {
  const fixture = await bookingFixture();
  const input = { ...fixture.input, requestId: randomUUID() };
  const replies = await Promise.all([requestAppointment(input), requestAppointment(input)]);
  expect(replies[0]?.appointment._id).toEqual(replies[1]?.appointment._id);
  expect(await appointmentsCollection().countDocuments()).toBe(1);
  expect(mail.recentMail()).toHaveLength(1);
  expect(await notifications.countUnread(fixture.vet._id)).toBe(1);
  await expect(
    requestAppointment({ ...input, reason: 'Different reason for a second request.' })
  ).rejects.toMatchObject({ statusCode: 409, reason: 'request-reused' });
});

it('retries email failure separately after confirmation and keeps a stable provider key and message', async () => {
  const fixture = await bookingFixture();
  const booking = (await requestAppointment(fixture.input))!.appointment;
  mail.clearRecentMail();
  const sender = vi
    .spyOn(mail, 'deliverMail')
    .mockResolvedValueOnce({ delivered: false, deliveryError: 'Provider unavailable' });
  const confirmed = (await decideAppointment({
    id: booking._id,
    decision: 'confirmed',
    professional: fixture.vet,
  }))!;
  expect(confirmed.appointment.status).toBe('confirmed');
  expect(confirmed.mail?.delivered).toBe(false);
  const stored = (await findAppointmentById(booking._id))!.deliveries![0];
  expect(stored).toMatchObject({ notificationPending: false, mailPending: true });
  expect(stored.mailMessage?.idempotencyKey).toBe(`appointment/${stored.id}`);
  await makeDeliveryDue(booking._id);
  await scanAppointmentDeliveries();
  expect(sender).toHaveBeenCalledTimes(2);
  expect(sender.mock.calls[0][0]).toEqual(sender.mock.calls[1][0]);
  expect(await notifications.countUnread(fixture.owner._id)).toBe(1);
  expect((await findAppointmentById(booking._id))?.deliveries).toEqual([]);
});

it('recovers a saved task after a worker dies with a claimed lease', async () => {
  const fixture = await bookingFixture();
  vi.spyOn(mail, 'deliverMail').mockResolvedValueOnce({
    delivered: false,
    deliveryError: 'Provider unavailable',
  });
  const booking = (await requestAppointment(fixture.input))!.appointment;
  const task = (await findAppointmentById(booking._id))!.deliveries![0];
  await appointmentsCollection().updateOne(
    { _id: booking._id, 'deliveries.id': task.id },
    {
      $set: {
        'deliveries.$.leaseUntil': new Date(Date.now() + 60_000),
        'deliveries.$.availableAt': new Date(0),
      },
    }
  );
  await scanAppointmentDeliveries();
  expect((await findAppointmentById(booking._id))?.deliveries).toHaveLength(1);
  await makeDeliveryDue(booking._id);
  await scanAppointmentDeliveries();
  expect((await findAppointmentById(booking._id))?.deliveries).toEqual([]);
});

it('does not duplicate a notice when delivery succeeds but its acknowledgement is lost', async () => {
  const fixture = await bookingFixture();
  const create = notifications.createNotification;
  vi.spyOn(notifications, 'createNotification').mockImplementationOnce(async (input) => {
    await create(input);
    throw new Error('Acknowledgement lost');
  });
  const booking = (await requestAppointment(fixture.input))!.appointment;
  expect(await notifications.countUnread(fixture.vet._id)).toBe(1);
  await makeDeliveryDue(booking._id);
  await scanAppointmentDeliveries();
  expect(await notifications.countUnread(fixture.vet._id)).toBe(1);
  expect((await findAppointmentById(booking._id))?.deliveries).toEqual([]);
});

it('scopes request IDs to the signed-in owner and rejects differing details in concurrent repeats', async () => {
  const fixture = await bookingFixture();
  const requestId = randomUUID();
  const later = new Date(fixture.startsAt.getTime() + 3_600_000);
  const results = await Promise.allSettled([
    requestAppointment({ ...fixture.input, requestId }),
    requestAppointment({ ...fixture.input, requestId, startsAt: later }),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  const rejected = results.find((result) => result.status === 'rejected');
  expect(rejected?.status === 'rejected' ? rejected.reason : null).toMatchObject({
    reason: 'request-reused',
  });
  const saved = (await appointmentsCollection().findOne())!;
  const other = await insertUser({ email: 'other-owner@example.com', password: 'pw12345678' });
  const free = saved.startsAt.getTime() === fixture.startsAt.getTime() ? later : fixture.startsAt;
  const second = await requestAppointment({
    ...fixture.input,
    client: other,
    requestId,
    startsAt: free,
  });
  expect(second?.appointment.client).toEqual(other._id);
  expect(await appointmentsCollection().countDocuments()).toBe(2);
});
