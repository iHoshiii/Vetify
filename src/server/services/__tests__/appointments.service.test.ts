import { APPOINTMENT_SLOT_MINUTES, MANILA_UTC_OFFSET_HOURS } from '@shared/limits';
import type { WeeklyScheduleItem } from '@shared/schemas';
import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  findHeldSlots,
  insertProfessional,
  insertUser,
  isDuplicateSlot,
  updateProfessionalProfile,
  updateProfessional,
  type User,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { cancelAppointment, decideAppointment, requestAppointment } from '../appointments.service';
import { clearRecentMail, recentMail } from '../mail.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);
beforeEach(clearRecentMail);

let seq = 0;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const DAY_NAMES: WeeklyScheduleItem['day'][] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * A slot a fortnight out, and the weekday it lands on.
 *
 * Computed rather than hard-coded, because the grid drops anything already past: a
 * fixture pinned to a date in 2026 is a suite that starts failing on its own.
 */
function soon(): { day: WeeklyScheduleItem['day']; at: Date } {
  const manila = new Date(Date.now() + 14 * DAY_MS + MANILA_UTC_OFFSET_HOURS * HOUR_MS);
  const [year, month, day] = manila.toISOString().slice(0, 10).split('-').map(Number);

  return {
    day: DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    // 09:00 in Manila, which is the hour the fixture schedule opens.
    at: new Date(Date.UTC(year, month - 1, day, 9 - MANILA_UTC_OFFSET_HOURS)),
  };
}

const SLOT = soon();

/** The next slot along, for the tests that need two different times. */
const LATER = new Date(SLOT.at.getTime() + APPOINTMENT_SLOT_MINUTES * 60_000);

async function account(name: string): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `${name}${seq}@example.com`,
    password: 'pw12345678',
    name: `Dr ${name} ${seq}`,
  });
}

/** A verified vet who works the morning the slot above falls on. */
async function vet(settings: { availabilityStatus?: 'available' | 'unavailable' | 'busy' } = {}) {
  const user = await account('vet');
  seq += 1;

  const application = await insertProfessional({
    user: user._id,
    fullName: `Marites Reyes ${seq}`,
    licenseNumber: `PRC-${900000 + seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    clinicName: 'Bayside Animal Clinic',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini Street',
        city: 'Cebu City',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    bio: 'Small animal practice, fifteen years of it.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
  });

  // The schedule and the availability are not part of a filed application: they are
  // settings a verified vet chooses afterwards, and insertProfessional writes neither.
  await updateProfessionalProfile(application._id, {
    availabilityStatus: settings.availabilityStatus ?? 'available',
    weeklySchedule: [{ day: SLOT.day, enabled: true, startTime: '09:00', endTime: '11:00' }],
  });

  return { user, application: await updateProfessional(application._id, { status: 'verified' }) };
}

function request(input: {
  client: User;
  professional: ObjectId;
  at?: Date;
  kind?: 'onsite' | 'virtual';
}) {
  return requestAppointment({
    client: input.client,
    professionalId: input.professional,
    kind: input.kind ?? 'onsite',
    startsAt: input.at ?? SLOT.at,
    petName: 'Milo',
    petSpecies: 'Dog',
    reason: 'A rash on his back leg that is not settling down.',
    phone: '+63 32 555 0101',
  });
}

/** The last message the outbox saw, which the log transport never sends. */
function lastMail() {
  return recentMail().at(-1);
}

describe('requestAppointment', () => {
  it('holds the slot and tells both sides', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();

    const result = await request({ client, professional: application!._id });

    expect(result?.appointment).toMatchObject({
      status: 'requested',
      // The flag the unique index watches. Nothing is confirmed, but the time is
      // already spoken for — which is the answer to "do I need to hurry".
      holdsSlot: true,
      minutes: APPOINTMENT_SLOT_MINUTES,
    });
    expect(result?.mail.professional.delivered).toBe(true);
    expect(result?.mail.client.delivered).toBe(true);

    const both = recentMail().map((message) => message.to);
    expect(both).toContain(vetUser.email);
    expect(both).toContain(client.email);
  });

  it('tells the vet what the decision turns on', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();

    await request({ client, professional: application!._id });

    const toVet = recentMail().find((message) => message.to === vetUser.email);
    expect(toVet?.text).toContain('Milo');
    expect(toVet?.text).toContain('A rash on his back leg');
    expect(toVet?.text).toContain('+63 32 555 0101');
  });

  it('refuses a second request for a slot somebody already holds', async () => {
    const first = await account('owner');
    const second = await account('owner');
    const { application } = await vet();

    await request({ client: first, professional: application!._id });

    // The whole point of the feature. Left to the unique index rather than a check,
    // so two clicks landing in the same millisecond cannot both win.
    await expect(request({ client: second, professional: application!._id })).rejects.toSatisfy(
      isDuplicateSlot
    );
  });

  it('leaves a different slot with the same vet alone', async () => {
    const first = await account('owner');
    const second = await account('owner');
    const { application } = await vet();

    await request({ client: first, professional: application!._id });
    const later = await request({ client: second, professional: application!._id, at: LATER });

    expect(later?.appointment.status).toBe('requested');
  });

  it('refuses a time the grid never offered', async () => {
    const client = await account('owner');
    const { application } = await vet();

    // Seventeen minutes past, which is not on any grid this schedule generates.
    const invented = new Date(SLOT.at.getTime() + 17 * 60_000);

    await expect(
      request({ client, professional: application!._id, at: invented })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses a vet who is not taking bookings', async () => {
    const client = await account('owner');
    const { application } = await vet({ availabilityStatus: 'busy' });

    await expect(request({ client, professional: application!._id })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('will not let a vet book their own time', async () => {
    const { user: vetUser, application } = await vet();

    await expect(
      request({ client: vetUser, professional: application!._id })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('answers null for an application that is not verified', async () => {
    const client = await account('owner');
    const { application } = await vet();
    await updateProfessional(application!._id, { status: 'pending' });

    // The same answer as a made-up id, on purpose: a guessed id should not reveal
    // that an unverified application is behind it.
    await expect(request({ client, professional: application!._id })).resolves.toBeNull();
  });

  it('answers null for a vet who does not exist', async () => {
    const client = await account('owner');

    await expect(request({ client, professional: new ObjectId() })).resolves.toBeNull();
  });
});

describe('decideAppointment', () => {
  it('confirms, keeps the slot, and tells the owner', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    clearRecentMail();
    const result = await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
    });

    expect(result?.appointment).toMatchObject({ status: 'confirmed', holdsSlot: true });
    expect(result?.mail?.delivered).toBe(true);
    expect(lastMail()?.to).toBe(client.email);
    expect(lastMail()?.subject).toContain('confirmed');
  });

  it('carries the meeting link into the email for a virtual consultation', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id, kind: 'virtual' });

    clearRecentMail();
    await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
      meetingUrl: 'https://meet.example.com/milo',
    });

    expect(lastMail()?.text).toContain('https://meet.example.com/milo');
  });

  it('will not confirm a virtual consultation without a link', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id, kind: 'virtual' });

    // A time with nothing to click is not a confirmed call. Enforced here rather than
    // in the schema because the kind is on the stored booking, not in the body.
    await expect(
      decideAppointment({
        id: booked!.appointment._id,
        decision: 'confirmed',
        professional: vetUser,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('frees the slot when it is turned down, and puts it back on the grid', async () => {
    const first = await account('owner');
    const second = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client: first, professional: application!._id });

    const result = await decideAppointment({
      id: booked!.appointment._id,
      decision: 'declined',
      professional: vetUser,
      reason: 'I am on leave that whole week, sorry.',
    });

    expect(result?.appointment).toMatchObject({ status: 'declined', holdsSlot: null });
    // The half that matters: somebody else can now have the time.
    await expect(
      findHeldSlots({ professional: application!._id, from: new Date(0), to: new Date(8.64e15) })
    ).resolves.toEqual([]);
    await expect(
      request({ client: second, professional: application!._id })
    ).resolves.toMatchObject({ appointment: { status: 'requested' } });
  });

  it("passes the vet's own words on to the owner", async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    clearRecentMail();
    await decideAppointment({
      id: booked!.appointment._id,
      decision: 'declined',
      professional: vetUser,
      reason: 'I am on leave that whole week, sorry.',
    });

    // Unlike the enquiry decline at the application stage, which withholds it: a
    // refused booking is not a judgement, and "I am on leave" is what stops the owner
    // asking again for the same day.
    expect(lastMail()?.text).toContain('I am on leave that whole week');
  });

  it('insists on a reason for turning one down', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await expect(
      decideAppointment({
        id: booked!.appointment._id,
        decision: 'declined',
        professional: vetUser,
        reason: '   ',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses a vet answering a booking that is not theirs', async () => {
    const client = await account('owner');
    const { application } = await vet();
    const other = await vet();
    const booked = await request({ client, professional: application!._id });

    await expect(
      decideAppointment({
        id: booked!.appointment._id,
        decision: 'confirmed',
        professional: other.user,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('will not confirm the same booking twice', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
    });

    await expect(
      decideAppointment({
        id: booked!.appointment._id,
        decision: 'confirmed',
        professional: vetUser,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('marks a confirmed booking done, and writes to nobody about it', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
    });

    clearRecentMail();
    const done = await decideAppointment({
      id: booked!.appointment._id,
      decision: 'completed',
      professional: vetUser,
    });

    // Still holding the slot: that time was in fact used, and a grid offering it again
    // later would be wrong about the past.
    expect(done?.appointment).toMatchObject({ status: 'completed', holdsSlot: true });
    // Nothing to send. The owner was there.
    expect(done?.mail).toBeNull();
    expect(recentMail()).toHaveLength(0);
  });

  it('cannot mark a booking done that was never agreed', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await expect(
      decideAppointment({
        id: booked!.appointment._id,
        decision: 'completed',
        professional: vetUser,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('answers null for a booking that does not exist', async () => {
    const { user: vetUser } = await vet();

    await expect(
      decideAppointment({ id: new ObjectId(), decision: 'confirmed', professional: vetUser })
    ).resolves.toBeNull();
  });
});

describe('cancelAppointment', () => {
  it('lets the owner call it off, frees the slot, and tells the vet who did', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    clearRecentMail();
    const result = await cancelAppointment({
      id: booked!.appointment._id,
      actor: client,
      reason: 'Milo is much better, no need for the visit.',
    });

    expect(result?.appointment).toMatchObject({ status: 'cancelled', holdsSlot: null });
    expect(result?.appointment.cancelledBy?.equals(client._id)).toBe(true);
    expect(lastMail()?.to).toBe(vetUser.email);
    // Named, so the recipient is not left wondering whether they did it themselves.
    expect(lastMail()?.text).toContain(client.name!);
  });

  it('lets the vet call it off, and tells the owner', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });
    await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
    });

    clearRecentMail();
    const result = await cancelAppointment({
      id: booked!.appointment._id,
      actor: vetUser,
      reason: 'An emergency surgery has run into that slot.',
    });

    expect(result?.appointment.status).toBe('cancelled');
    expect(lastMail()?.to).toBe(client.email);
    expect(lastMail()?.text).toContain('An emergency surgery');
  });

  it('puts the slot back for somebody else', async () => {
    const first = await account('owner');
    const second = await account('owner');
    const { application } = await vet();
    const booked = await request({ client: first, professional: application!._id });

    await cancelAppointment({
      id: booked!.appointment._id,
      actor: first,
      reason: 'Milo is much better, no need for the visit.',
    });

    await expect(
      request({ client: second, professional: application!._id })
    ).resolves.toMatchObject({ appointment: { status: 'requested' } });
  });

  it('refuses somebody who is neither party', async () => {
    const client = await account('owner');
    const stranger = await account('owner');
    const { application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await expect(
      cancelAppointment({
        id: booked!.appointment._id,
        actor: stranger,
        reason: 'I would simply like it cancelled.',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('will not cancel one that is already settled', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await decideAppointment({
      id: booked!.appointment._id,
      decision: 'declined',
      professional: vetUser,
      reason: 'I am on leave that whole week, sorry.',
    });

    // A declined booking holds nothing and has already been answered. There is no
    // version of "cancel" that means anything for it.
    await expect(
      cancelAppointment({
        id: booked!.appointment._id,
        actor: client,
        reason: 'Cancelling this after the fact.',
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('insists on a reason', async () => {
    const client = await account('owner');
    const { application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await expect(
      cancelAppointment({ id: booked!.appointment._id, actor: client, reason: '  ' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('answers null for a booking that does not exist', async () => {
    const client = await account('owner');

    await expect(
      cancelAppointment({ id: new ObjectId(), actor: client, reason: 'Never mind this one.' })
    ).resolves.toBeNull();
  });
});
