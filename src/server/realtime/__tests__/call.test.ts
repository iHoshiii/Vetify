import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  insertAppointment,
  updateAppointment,
  type AppointmentKind,
  type AppointmentStatus,
} from '../../models';
import { canJoinCall } from '../call';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function booking(overrides: {
  minutesAhead: number;
  kind?: AppointmentKind;
  status?: AppointmentStatus;
  minutes?: number;
}) {
  const client = new ObjectId();
  const professionalUser = new ObjectId();
  const startsAt = new Date(Date.now() + overrides.minutesAhead * 60_000);
  const appointment = await insertAppointment({
    professional: new ObjectId(),
    professionalUser,
    client,
    kind: overrides.kind ?? 'virtual',
    startsAt,
    minutes: overrides.minutes ?? 30,
    heldSlots: [startsAt],
    petSpecies: 'dog',
    reason: 'Check',
  });
  const status = overrides.status ?? 'confirmed';
  if (status !== 'requested') await updateAppointment(appointment._id, { status });
  return {
    id: appointment._id.toString(),
    client: client.toString(),
    professionalUser: professionalUser.toString(),
  };
}

describe('canJoinCall', () => {
  it('lets either party into a confirmed virtual booking inside the window', async () => {
    const b = await booking({ minutesAhead: 5 });
    expect(await canJoinCall(b.client, b.id)).toBe(true);
    expect(await canJoinCall(b.professionalUser, b.id)).toBe(true);
  });

  it('refuses someone who is neither party', async () => {
    const b = await booking({ minutesAhead: 5 });
    expect(await canJoinCall(new ObjectId().toString(), b.id)).toBe(false);
  });

  it('refuses a booking that is not a virtual call', async () => {
    const b = await booking({ minutesAhead: 5, kind: 'onsite' });
    expect(await canJoinCall(b.client, b.id)).toBe(false);
  });

  it('refuses a booking that is not confirmed', async () => {
    const b = await booking({ minutesAhead: 5, status: 'requested' });
    expect(await canJoinCall(b.client, b.id)).toBe(false);
  });

  it('refuses before the window opens and after it closes', async () => {
    const early = await booking({ minutesAhead: 30 });
    expect(await canJoinCall(early.client, early.id)).toBe(false);

    const over = await booking({ minutesAhead: -40, minutes: 30 });
    expect(await canJoinCall(over.client, over.id)).toBe(false);
  });
});
