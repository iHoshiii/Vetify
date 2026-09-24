import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  findAppointmentById,
  insertAppointment,
  updateAppointment,
  type AppointmentStatus,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { countUnread, listForUser } from '../notifications.service';
import { scanReminders } from '../reminders.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

// No professional row is seeded, so the scanner falls back to the 30-minute default lead.
async function booking(minutesAhead: number, status: AppointmentStatus = 'confirmed') {
  const professionalUser = new ObjectId();
  const startsAt = new Date(Date.now() + minutesAhead * 60_000);
  const appointment = await insertAppointment({
    professional: new ObjectId(),
    professionalUser,
    client: new ObjectId(),
    kind: 'virtual',
    startsAt,
    minutes: 30,
    heldSlots: [startsAt],
    petName: 'Rex',
    petSpecies: 'dog',
    reason: 'Annual check',
  });
  if (status !== 'requested') await updateAppointment(appointment._id, { status });
  return { appointment, professionalUser };
}

describe('reminders.service', () => {
  it('reminds a vet once when a confirmed booking enters the lead window', async () => {
    const { appointment, professionalUser } = await booking(20);

    await scanReminders();

    expect(await countUnread(professionalUser)).toBe(1);
    const page = await listForUser({ user: professionalUser, page: 1, limit: 20 });
    expect(page.items[0].kind).toBe('booking_reminder');
    expect((await findAppointmentById(appointment._id))?.reminderSentAt).not.toBeNull();
  });

  it('does not re-send after a restart or an overlapping tick', async () => {
    const { professionalUser } = await booking(20);

    await scanReminders();
    await scanReminders();

    expect(await countUnread(professionalUser)).toBe(1);
  });

  it('leaves a confirmed booking still short of its lead window alone', async () => {
    const { appointment, professionalUser } = await booking(50);

    await scanReminders();

    expect(await countUnread(professionalUser)).toBe(0);
    expect((await findAppointmentById(appointment._id))?.reminderSentAt).toBeNull();
  });

  it('ignores a booking that is not confirmed', async () => {
    const { professionalUser } = await booking(20, 'requested');

    await scanReminders();

    expect(await countUnread(professionalUser)).toBe(0);
  });
});
