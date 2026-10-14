import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import * as models from '../../models';
import { appointmentsCollection, findAppointmentById, updateAppointment } from '../../models';
import { moveAppointment } from '../../models/appointments/writes';
import { completeConfirmed, claimReminder } from '../../models/appointments/scanners';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { cancelAppointment, decideAppointment, requestAppointment } from '../appointments.service';
import { bookingFixture } from './appointment-reliability-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

it('returns a conflict to the losing service action after both users read the same booking', async () => {
  const fixture = await bookingFixture();
  const booking = (await requestAppointment(fixture.input))!.appointment;
  const read = models.findAppointmentById;
  let arrivals = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.spyOn(models, 'findAppointmentById').mockImplementation(async (id) => {
    const current = await read(id);
    arrivals += 1;
    if (arrivals === 2) release();
    await gate;
    return current;
  });
  const replies = await Promise.allSettled([
    decideAppointment({ id: booking._id, decision: 'confirmed', professional: fixture.vet }),
    cancelAppointment({ id: booking._id, actor: fixture.owner, reason: 'Schedule changed' }),
  ]);
  expect(replies.filter((reply) => reply.status === 'fulfilled')).toHaveLength(1);
  const lost = replies.find((reply) => reply.status === 'rejected');
  expect(lost?.status === 'rejected' ? lost.reason : null).toMatchObject({
    statusCode: 409,
    reason: 'appointment-changed',
  });
});

it('allows only one simultaneous confirmation or cancellation from the same booking version', async () => {
  const fixture = await bookingFixture();
  const booking = (await requestAppointment(fixture.input))!.appointment;
  const writes = await Promise.all([
    updateAppointment(booking._id, { status: 'confirmed', holdsSlot: true }, booking),
    updateAppointment(
      booking._id,
      { status: 'cancelled', holdsSlot: null, cancelledBy: fixture.owner._id },
      booking
    ),
  ]);
  expect(writes.filter(Boolean)).toHaveLength(1);
  const final = await findAppointmentById(booking._id);
  expect(final?.revision).toBe(1);
  expect(final?.holdsSlot).toBe(final?.status === 'confirmed' ? true : null);
});

it('rejects an outdated cancellation even if rescheduling returns to the original time and status', async () => {
  const fixture = await bookingFixture();
  const original = (await requestAppointment(fixture.input))!.appointment;
  const later = new Date(original.startsAt.getTime() + 3_600_000);
  const moved = await moveAppointment(
    original._id,
    { startsAt: later, heldSlots: [later] },
    original
  );
  const returned = await moveAppointment(
    original._id,
    { startsAt: original.startsAt, heldSlots: original.heldSlots },
    moved!
  );
  expect(returned?.revision).toBe(2);
  expect(
    await updateAppointment(original._id, { status: 'cancelled', holdsSlot: null }, original)
  ).toBeNull();
});

it('preserves slot uniqueness and the original booking when rescheduling onto an occupied time', async () => {
  const fixture = await bookingFixture();
  const first = (await requestAppointment(fixture.input))!.appointment;
  const later = new Date(first.startsAt.getTime() + 3_600_000);
  await requestAppointment({ ...fixture.input, startsAt: later });
  await expect(
    moveAppointment(first._id, { startsAt: later, heldSlots: [later] }, first)
  ).rejects.toMatchObject({ code: 11000 });
  expect((await findAppointmentById(first._id))?.startsAt).toEqual(first.startsAt);
});

it('does not complete or remind a booking after its schedule changes', async () => {
  const fixture = await bookingFixture();
  const original = (await requestAppointment(fixture.input))!.appointment;
  const confirmed = (await updateAppointment(original._id, { status: 'confirmed' }))!;
  const later = new Date(original.startsAt.getTime() + 3_600_000);
  await moveAppointment(original._id, { startsAt: later, heldSlots: [later] }, confirmed);
  expect(await completeConfirmed(original._id, confirmed)).toBeNull();
  expect(await claimReminder(original._id, confirmed)).toBeNull();
  expect((await findAppointmentById(original._id))?.status).toBe('requested');
});

it('guards simultaneous reschedule and cancellation against the same revision', async () => {
  const fixture = await bookingFixture();
  const original = (await requestAppointment(fixture.input))!.appointment;
  const later = new Date(original.startsAt.getTime() + 3_600_000);
  const writes = await Promise.all([
    moveAppointment(original._id, { startsAt: later, heldSlots: [later] }, original),
    updateAppointment(original._id, { status: 'cancelled', holdsSlot: null }, original),
  ]);
  expect(writes.filter(Boolean)).toHaveLength(1);
  expect(await appointmentsCollection().countDocuments({ _id: original._id })).toBe(1);
});
