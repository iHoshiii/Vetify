import { ObjectId } from 'mongodb';
import type { Socket } from 'socket.io';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  insertAppointment,
  updateAppointment,
  type AppointmentKind,
  type AppointmentStatus,
} from '../../models';
import { canJoinCall, relayChat } from '../call';
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

  it('keeps the window open across a back-to-back booking with the same two people', async () => {
    const client = new ObjectId();
    const professional = new ObjectId();
    const professionalUser = new ObjectId();
    // First slot ran out ten minutes ago on its own, so alone it would be closed.
    const firstStart = new Date(Date.now() - 40 * 60_000);
    const chained = { professional, professionalUser, client, kind: 'virtual' as const };

    const first = await insertAppointment({
      ...chained,
      startsAt: firstStart,
      minutes: 30,
      heldSlots: [firstStart],
      petSpecies: 'dog',
      reason: 'Check',
    });
    await updateAppointment(first._id, { status: 'confirmed' });

    // Second slot starts exactly where the first ends and runs on, so the session ends in the future.
    const secondStart = new Date(firstStart.getTime() + 30 * 60_000);
    const second = await insertAppointment({
      ...chained,
      startsAt: secondStart,
      minutes: 30,
      heldSlots: [secondStart],
      petSpecies: 'dog',
      reason: 'Check',
    });
    await updateAppointment(second._id, { status: 'confirmed' });

    expect(await canJoinCall(client.toString(), first._id.toString())).toBe(true);
  });
});

// A socket stub carrying only what relayChat touches: its rooms and a capturing `to().emit()`.
function fakeSocket(rooms: string[]) {
  const sent: { event: string; data: unknown }[] = [];
  const socket = {
    rooms: new Set(rooms),
    to: () => ({ emit: (event: string, data: unknown) => sent.push({ event, data }) }),
  } as unknown as Socket;
  return { socket, sent };
}

describe('relayChat', () => {
  const room = 'call:abc';

  it('relays a trimmed line to the room a member sits in', () => {
    const { socket, sent } = fakeSocket([room]);
    relayChat(socket, { appointmentId: 'abc', text: '  hello  ' });
    expect(sent).toEqual([{ event: 'call:chat', data: { text: 'hello' } }]);
  });

  it('drops a line from a socket not in the room', () => {
    const { socket, sent } = fakeSocket([]);
    relayChat(socket, { appointmentId: 'abc', text: 'hello' });
    expect(sent).toHaveLength(0);
  });

  it('ignores an empty or non-string message', () => {
    const { socket, sent } = fakeSocket([room]);
    relayChat(socket, { appointmentId: 'abc', text: '   ' });
    relayChat(socket, { appointmentId: 'abc', text: 42 });
    relayChat(socket, { appointmentId: 'abc' });
    expect(sent).toHaveLength(0);
  });

  it('caps a very long line at the shared message limit', () => {
    const { socket, sent } = fakeSocket([room]);
    relayChat(socket, { appointmentId: 'abc', text: 'x'.repeat(5000) });
    expect((sent[0].data as { text: string }).text).toHaveLength(2000);
  });
});
