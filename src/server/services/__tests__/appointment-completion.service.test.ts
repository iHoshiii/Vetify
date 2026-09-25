import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { AppointmentKind } from '@shared/schemas';

import {
  findAppointmentById,
  insertAppointment,
  updateAppointment,
  type AppointmentStatus,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { scanCompletions } from '../appointment-completion.service';
import { countUnread, listForUser } from '../notifications.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

// Every booking runs 30 minutes, so minutesAhead of -40 has already ended and -10 is still running. A virtual booking nobody joined stays unrateable; an onsite one is rateable by attendance.
async function booking(
  minutesAhead: number,
  status: AppointmentStatus = 'confirmed',
  kind: AppointmentKind = 'virtual'
) {
  const startsAt = new Date(Date.now() + minutesAhead * 60_000);
  const appointment = await insertAppointment({
    professional: new ObjectId(),
    professionalUser: new ObjectId(),
    client: new ObjectId(),
    kind,
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

  it('nudges the owner to review once a rateable booking completes', async () => {
    const appointment = await booking(-40, 'confirmed', 'onsite');

    await scanCompletions();

    expect(await countUnread(appointment.client)).toBe(1);
    const page = await listForUser({ user: appointment.client, page: 1, limit: 20 });
    expect(page.items[0].kind).toBe('review_request');
    expect((await findAppointmentById(appointment._id))?.reviewPromptSentAt).not.toBeNull();
  });

  it('does not nudge twice across scans', async () => {
    const appointment = await booking(-40, 'confirmed', 'onsite');

    await scanCompletions();
    await scanCompletions();

    expect(await countUnread(appointment.client)).toBe(1);
  });

  it('does not nudge for a virtual booking nobody joined', async () => {
    const appointment = await booking(-40);

    await scanCompletions();

    expect((await findAppointmentById(appointment._id))?.status).toBe('completed');
    expect(await countUnread(appointment.client)).toBe(0);
    expect((await findAppointmentById(appointment._id))?.reviewPromptSentAt).toBeNull();
  });
});
