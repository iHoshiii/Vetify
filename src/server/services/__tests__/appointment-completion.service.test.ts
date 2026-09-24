import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  findAppointmentById,
  insertAppointment,
  updateAppointment,
  type AppointmentStatus,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { scanCompletions } from '../appointment-completion.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

// Every booking runs 30 minutes, so minutesAhead of -40 has already ended and -10 is still running.
async function booking(minutesAhead: number, status: AppointmentStatus = 'confirmed') {
  const startsAt = new Date(Date.now() + minutesAhead * 60_000);
  const appointment = await insertAppointment({
    professional: new ObjectId(),
    professionalUser: new ObjectId(),
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
  return appointment;
}

describe('appointment-completion.service', () => {
  it('completes a confirmed booking whose end has passed', async () => {
    const appointment = await booking(-40);

    await scanCompletions();

    const after = await findAppointmentById(appointment._id);
    expect(after?.status).toBe('completed');
    // completed is a live status, so the slot stays held.
    expect(after?.holdsSlot).toBe(true);
  });

  it('leaves a confirmed booking that is still running alone', async () => {
    const appointment = await booking(-10);

    await scanCompletions();

    expect((await findAppointmentById(appointment._id))?.status).toBe('confirmed');
  });

  it('leaves a future booking alone', async () => {
    const appointment = await booking(60);

    await scanCompletions();

    expect((await findAppointmentById(appointment._id))?.status).toBe('confirmed');
  });

  it('ignores a booking that is not confirmed', async () => {
    const appointment = await booking(-40, 'requested');

    await scanCompletions();

    expect((await findAppointmentById(appointment._id))?.status).toBe('requested');
  });
});
