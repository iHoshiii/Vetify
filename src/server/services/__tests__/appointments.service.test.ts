import {
  APPOINTMENT_NO_SHOW_GRACE_MINUTES,
  APPOINTMENT_SLOT_MINUTES,
  MANILA_UTC_OFFSET_HOURS,
  PROFESSIONAL_REVIEWS_PAGE_SIZE,
} from '@shared/limits';
import type { WeeklyScheduleItem } from '@shared/schemas';
import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appointmentsCollection,
  findHeldSlots,
  findProfessionalById,
  findProfessionalReviews,
  insertProfessional,
  insertUser,
  isDuplicateSlot,
  markCallConnected,
  markCallJoined,
  markClientJoined,
  maskName,
  ratingBreakdownForProfessional,
  toReviewPage,
  updateProfessionalProfile,
  updateProfessional,
  type AppointmentDocument,
  type User,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  cancelAppointment,
  decideAppointment,
  rateAppointment,
  requestAppointment,
} from '../appointments.service';
import { clearRecentMail, recentMail } from '../mail.service';
import * as notifications from '../notifications.service';

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

const CLINIC = {
  kind: 'clinic' as const,
  line1: '12 Mabini Street',
  city: 'Cebu City',
  province: 'Cebu',
  postalCode: '6000',
  fix: null,
};
const HOME = { ...CLINIC, kind: 'home' as const, line1: '44 Sampaguita Lane' };

/** A verified vet who works the morning the slot above falls on. */
async function vet(
  settings: {
    availabilityStatus?: 'available' | 'unavailable' | 'busy';
    addresses?: Array<typeof CLINIC | typeof HOME>;
  } = {}
) {
  const user = await account('vet');
  seq += 1;

  const application = await insertProfessional({
    user: user._id,
    fullName: `Marites Reyes ${seq}`,
    licenseNumber: `PRC-${900000 + seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    clinicName: 'Bayside Animal Clinic',
    addresses: settings.addresses ?? [CLINIC, HOME],
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
  slots?: number;
}) {
  return requestAppointment({
    client: input.client,
    professionalId: input.professional,
    kind: input.kind ?? 'onsite',
    startsAt: input.at ?? SLOT.at,
    slots: input.slots,
    petName: 'Milo',
    petSpecies: 'Dog',
    reason: 'A rash on his back leg that is not settling down.',
    phone: '+63 32 555 0101',
    clientEmail: input.client.email,
  });
}

/** The last message the outbox saw, which the log transport never sends. */
function lastMail() {
  return recentMail().at(-1);
}

describe('requestAppointment', () => {
  it('holds the slot and tells the vet', async () => {
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

    const to = recentMail().map((message) => message.to);
    expect(to).toContain(vetUser.email);
    // Nothing to the owner at request time; their address waits for the decision.
    expect(to).not.toContain(client.email);
  });

  it('persists the booking email but sends the owner nothing yet', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();

    const result = await request({ client, professional: application!._id });

    expect(result?.appointment.clientEmail).toBe(client.email);
    const to = recentMail().map((message) => message.to);
    expect(to).toContain(vetUser.email);
    expect(to).not.toContain(client.email);
  });

  it('keeps no booking email when none was given', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();

    const result = await requestAppointment({
      client,
      professionalId: application!._id,
      kind: 'onsite',
      startsAt: SLOT.at,
      petSpecies: 'Dog',
      reason: 'A rash on his back leg that is not settling down.',
      phone: '+639325550101',
    });

    expect(result?.appointment.clientEmail).toBeNull();
    expect(recentMail().map((message) => message.to)).toContain(vetUser.email);
  });

  it('refuses a kind the vet did not register the place for', async () => {
    const client = await account('owner');
    // A clinic address, no home: this vet does onsite visits and no calls.
    const { application } = await vet({ addresses: [CLINIC] });

    await expect(
      request({ client, professional: application!._id, kind: 'virtual' })
    ).rejects.toThrow(/does not offer that kind/);
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

  it('holds both hours of a two-hour booking', async () => {
    const client = await account('owner');
    const { application } = await vet();

    const result = await request({ client, professional: application!._id, slots: 2 });

    // Two slots means twice the minutes and two held hours, the second at LATER.
    expect(result?.appointment.minutes).toBe(APPOINTMENT_SLOT_MINUTES * 2);
    const held = await findHeldSlots({
      professional: application!._id,
      from: new Date(0),
      to: new Date(8.64e15),
    });
    expect(held.map((at) => at.getTime()).sort()).toEqual(
      [SLOT.at.getTime(), LATER.getTime()].sort()
    );
  });

  it('refuses a one-hour booking on the second hour a two-hour one already holds', async () => {
    const first = await account('owner');
    const second = await account('owner');
    const { application } = await vet();

    await request({ client: first, professional: application!._id, slots: 2 });

    // 10:00 is free to click, but the 09:00 two-hour booking is already sitting on it.
    await expect(
      request({ client: second, professional: application!._id, at: LATER })
    ).rejects.toSatisfy(isDuplicateSlot);
  });

  it('refuses a two-hour booking whose second hour is already held', async () => {
    const first = await account('owner');
    const second = await account('owner');
    const { application } = await vet();

    await request({ client: first, professional: application!._id, at: LATER });

    // 09:00 is free, but the span reaches into 10:00, which the first booking holds.
    await expect(
      request({ client: second, professional: application!._id, slots: 2 })
    ).rejects.toSatisfy(isDuplicateSlot);
  });

  it('refuses a two-hour booking whose second hour runs past closing', async () => {
    const client = await account('owner');
    const { application } = await vet();

    // 10:00 is the last slot of a 09:00-11:00 day, so a two-hour span from it overruns.
    await expect(
      request({ client, professional: application!._id, at: LATER, slots: 2 })
    ).rejects.toMatchObject({ statusCode: 400 });
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

  it('confirms a virtual consultation without needing a link', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id, kind: 'virtual' });

    clearRecentMail();
    const result = await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
    });

    expect(result?.appointment).toMatchObject({ status: 'confirmed', kind: 'virtual' });
    expect(result?.mail?.delivered).toBe(true);
    // No meeting link: the owner is pointed at the in-app session, not a URL to click.
    expect(lastMail()?.text).not.toContain('Join here');
    expect(lastMail()?.text).toContain('start the session');
  });

  it('sends no confirmation email when the booking carried no address', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    // No clientEmail on the booking, so a confirmation has nowhere to go.
    const booked = await requestAppointment({
      client,
      professionalId: application!._id,
      kind: 'onsite',
      startsAt: SLOT.at,
      petSpecies: 'Dog',
      reason: 'A rash on his back leg that is not settling down.',
      phone: '+639325550101',
    });

    clearRecentMail();
    const result = await decideAppointment({
      id: booked!.appointment._id,
      decision: 'confirmed',
      professional: vetUser,
    });

    expect(result?.appointment.status).toBe('confirmed');
    expect(result?.mail).toBeNull();
    expect(recentMail()).toHaveLength(0);
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

describe('rateAppointment', () => {
  // A booking taken all the way to completed, which is the only state a rating is allowed from.
  async function completed(at: Date = SLOT.at) {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id, at });
    for (const decision of ['confirmed', 'completed'] as const) {
      await decideAppointment({ id: booked!.appointment._id, decision, professional: vetUser });
    }
    return { client, vetUser, application: application!, id: booked!.appointment._id };
  }

  it("stars a finished booking and moves the vet's average", async () => {
    const { client, application, id } = await completed();

    const rated = await rateAppointment({ id, actor: client, rating: 4 });

    expect(rated?.rating).toBe(4);
    const vetNow = await findProfessionalById(application._id);
    expect(vetNow?.ratingAverage).toBe(4);
    expect(vetNow?.ratingCount).toBe(1);
  });

  it('notifies the vet when their visit is rated, without leaking the note', async () => {
    const { client, vetUser, id } = await completed();
    const before = await notifications.countUnread(vetUser._id);

    await rateAppointment({ id, actor: client, rating: 4, comment: 'Gentle and thorough' });

    expect(await notifications.countUnread(vetUser._id)).toBe(before + 1);
    const page = await notifications.listForUser({ user: vetUser._id, page: 1, limit: 20 });
    expect(page.items[0].kind).toBe('appointment_rated');
    expect(page.items[0].body).not.toContain('Gentle and thorough');
  });

  it('keeps the rating when notifying the vet fails', async () => {
    const { client, application, vetUser, id } = await completed();
    const before = await notifications.countUnread(vetUser._id);
    const spy = vi
      .spyOn(notifications, 'createNotification')
      .mockRejectedValueOnce(new Error('boom'));

    const rated = await rateAppointment({ id, actor: client, rating: 4 });

    expect(rated?.rating).toBe(4);
    expect((await findProfessionalById(application._id))?.ratingCount).toBe(1);
    expect(await notifications.countUnread(vetUser._id)).toBe(before);
    spy.mockRestore();
  });

  it('rates a virtual call both sides connected on before its time is up, note and all', async () => {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id, kind: 'virtual' });
    const id = booked!.appointment._id;
    await decideAppointment({ id, decision: 'confirmed', professional: vetUser });
    await markCallConnected(id);

    const rated = await rateAppointment({
      id,
      actor: client,
      rating: 5,
      comment: 'Kind and quick',
    });

    // Still confirmed: the owner rated straight off the call, before the completion sweep ran.
    expect(rated?.status).toBe('confirmed');
    expect(rated?.rating).toBe(5);
    expect(rated?.ratingComment).toBe('Kind and quick');
    const vetNow = await findProfessionalById(application!._id);
    expect(vetNow?.ratingCount).toBe(1);
  });

  // Pushes a booking's start into the past so the no-show grace can be exercised without waiting.
  async function backdateStart(id: ObjectId, minutesAgo: number) {
    await appointmentsCollection().updateOne(
      { _id: id },
      { $set: { startsAt: new Date(Date.now() - minutesAgo * 60_000) } }
    );
  }

  async function confirmedVirtual() {
    const client = await account('owner');
    const { user: vetUser, application } = await vet();
    const booked = await request({ client, professional: application!._id, kind: 'virtual' });
    const id = booked!.appointment._id;
    await decideAppointment({ id, decision: 'confirmed', professional: vetUser });
    return { client, vetUser, application: application!, id };
  }

  it('lets a booker who showed up rate a vet who never joined once the grace passes', async () => {
    const { client, application, id } = await confirmedVirtual();
    await markClientJoined(id);
    await backdateStart(id, APPOINTMENT_NO_SHOW_GRACE_MINUTES + 1);

    const rated = await rateAppointment({ id, actor: client, rating: 1, comment: 'Never showed' });

    // Still confirmed: the sweep only completes it once its whole span is past.
    expect(rated?.status).toBe('confirmed');
    expect(rated?.rating).toBe(1);
    const vetNow = await findProfessionalById(application._id);
    expect(vetNow?.ratingAverage).toBe(1);
    expect(vetNow?.ratingCount).toBe(1);
  });

  it('refuses a no-show rating before the grace has passed', async () => {
    const { client, id } = await confirmedVirtual();
    await markClientJoined(id);
    await backdateStart(id, APPOINTMENT_NO_SHOW_GRACE_MINUTES - 5);

    await expect(rateAppointment({ id, actor: client, rating: 1 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('refuses a no-show rating when the booker never joined', async () => {
    const { client, id } = await confirmedVirtual();
    // Party-agnostic: someone joined, but not the booker, so this must not open a rating.
    await markCallJoined(id);
    await backdateStart(id, APPOINTMENT_NO_SHOW_GRACE_MINUTES + 1);

    await expect(rateAppointment({ id, actor: client, rating: 1 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('averages every rated booking a vet has', async () => {
    const one = await account('owner');
    const two = await account('owner');
    const { user: vetUser, application } = await vet();

    const first = await request({ client: one, professional: application!._id });
    const second = await request({ client: two, professional: application!._id, at: LATER });
    for (const booked of [first, second]) {
      for (const decision of ['confirmed', 'completed'] as const) {
        await decideAppointment({ id: booked!.appointment._id, decision, professional: vetUser });
      }
    }

    await rateAppointment({ id: first!.appointment._id, actor: one, rating: 5 });
    await rateAppointment({ id: second!.appointment._id, actor: two, rating: 3 });

    const vetNow = await findProfessionalById(application!._id);
    expect(vetNow?.ratingAverage).toBe(4);
    expect(vetNow?.ratingCount).toBe(2);
  });

  it('refuses a second rating on the same booking', async () => {
    const { client, id } = await completed();
    await rateAppointment({ id, actor: client, rating: 5 });

    await expect(rateAppointment({ id, actor: client, rating: 1 })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('refuses one that has not been completed', async () => {
    const client = await account('owner');
    const { application } = await vet();
    const booked = await request({ client, professional: application!._id });

    await expect(
      rateAppointment({ id: booked!.appointment._id, actor: client, rating: 5 })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('refuses anyone who is not the owner', async () => {
    const { vetUser, id } = await completed();

    await expect(rateAppointment({ id, actor: vetUser, rating: 5 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('answers null for a booking that does not exist', async () => {
    const client = await account('owner');

    await expect(
      rateAppointment({ id: new ObjectId(), actor: client, rating: 5 })
    ).resolves.toBeNull();
  });
});

describe('maskName', () => {
  it('keeps each first letter and stars the rest', () => {
    expect(maskName('Aldwin Loreto')).toBe('A***** L*****');
    expect(maskName('Bea')).toBe('B**');
  });

  it('falls back to a generic label when the name is blank or missing', () => {
    expect(maskName('   ')).toBe('A pet owner');
    expect(maskName(null)).toBe('A pet owner');
  });
});

describe('toReviewPage', () => {
  it('wraps a page and derives the count', () => {
    expect(toReviewPage({ items: [], total: 6, page: 2, limit: 5 })).toEqual({
      items: [],
      page: 2,
      limit: 5,
      total: 6,
      pages: 2,
    });
  });

  it('never reports fewer than one page', () => {
    expect(toReviewPage({ items: [], total: 0, page: 1, limit: 5 }).pages).toBe(1);
  });
});
describe('findProfessionalReviews', () => {
  // A rated booking written straight into the collection, so a vet can be given many reviews without the two-slot fixture schedule getting in the way. reviewerName null uses a client id with no user, exercising the "account gone" masking path.
  async function seedReview(input: {
    professional: ObjectId;
    reviewerName?: string | null;
    rating?: number | null;
    comment?: string | null;
    ratedAt?: Date;
    legacy?: boolean;
  }): Promise<ObjectId> {
    seq += 1;
    const client =
      input.reviewerName === null
        ? new ObjectId()
        : (
            await insertUser({
              email: `rater${seq}@example.com`,
              password: 'pw12345678',
              name: input.reviewerName ?? 'Aldwin Loreto',
            })
          )._id;
    const when = input.ratedAt ?? new Date();
    const doc: AppointmentDocument = {
      _id: new ObjectId(),
      professional: input.professional,
      professionalUser: new ObjectId(),
      client,
      kind: 'onsite',
      startsAt: when,
      minutes: APPOINTMENT_SLOT_MINUTES,
      heldSlots: [when],
      status: 'completed',
      holdsSlot: true,
      petName: null,
      petSpecies: 'Dog',
      petBreed: null,
      petAge: null,
      reason: 'A checkup.',
      phone: null,
      clientEmail: null,
      meetingUrl: null,
      refusalReason: null,
      cancelledBy: null,
      decidedAt: when,
      reminderSentAt: null,
      reviewPromptSentAt: null,
      joinedAt: null,
      consultedAt: null,
      clientJoinedAt: null,
      rating: input.rating === undefined ? 5 : input.rating,
      ratingComment: input.comment ?? null,
      // legacy rows predate the field, so leave it null to prove the read falls back to updatedAt
      ratedAt: input.legacy ? null : when,
      createdAt: when,
      updatedAt: when,
    };
    await appointmentsCollection().insertOne(doc);
    return doc._id;
  }

  it('masks the reviewer and keeps the stars, note and date', async () => {
    const professional = new ObjectId();
    const when = new Date(Date.now() - HOUR_MS);
    await seedReview({
      professional,
      reviewerName: 'Aldwin Loreto',
      rating: 4,
      comment: 'Great with my cat',
      ratedAt: when,
    });

    const { items, total } = await findProfessionalReviews({ professional });

    expect(total).toBe(1);
    expect(items[0]).toMatchObject({
      stars: 4,
      comment: 'Great with my cat',
      reviewer: 'A***** L*****',
      ratedAt: when.toISOString(),
    });
  });

  it('counts only rated bookings', async () => {
    const professional = new ObjectId();
    await seedReview({ professional, rating: 5 });
    await seedReview({ professional, rating: null, comment: null });

    const { items, total } = await findProfessionalReviews({ professional });

    expect(total).toBe(1);
    expect(items).toHaveLength(1);
  });

  it('orders newest first', async () => {
    const professional = new ObjectId();
    const t1 = new Date(Date.now() - 3 * HOUR_MS);
    const t2 = new Date(Date.now() - 2 * HOUR_MS);
    const t3 = new Date(Date.now() - 1 * HOUR_MS);
    await seedReview({ professional, ratedAt: t2 });
    await seedReview({ professional, ratedAt: t1 });
    await seedReview({ professional, ratedAt: t3 });

    const { items } = await findProfessionalReviews({ professional });

    expect(items.map((review) => review.ratedAt)).toEqual([t3, t2, t1].map((d) => d.toISOString()));
  });

  it('paginates at the shared page size', async () => {
    const professional = new ObjectId();
    for (let i = 0; i < PROFESSIONAL_REVIEWS_PAGE_SIZE + 1; i += 1) {
      await seedReview({ professional, ratedAt: new Date(Date.now() - i * HOUR_MS) });
    }

    const first = await findProfessionalReviews({ professional, page: 1 });
    const second = await findProfessionalReviews({ professional, page: 2 });

    expect(first.total).toBe(PROFESSIONAL_REVIEWS_PAGE_SIZE + 1);
    expect(first.items).toHaveLength(PROFESSIONAL_REVIEWS_PAGE_SIZE);
    expect(second.total).toBe(PROFESSIONAL_REVIEWS_PAGE_SIZE + 1);
    expect(second.items).toHaveLength(1);
    const firstIds = new Set(first.items.map((review) => review.id));
    expect(firstIds.has(second.items[0].id)).toBe(false);
  });

  it('narrows to commented reviews and reflects it in the total', async () => {
    const professional = new ObjectId();
    await seedReview({ professional, comment: 'Gentle and thorough' });
    await seedReview({ professional, comment: 'Ran late but kind' });
    await seedReview({ professional, comment: null });

    const commented = await findProfessionalReviews({ professional, withComment: true });
    const all = await findProfessionalReviews({ professional });

    expect(all.total).toBe(3);
    expect(commented.total).toBe(2);
    expect(commented.items.every((review) => review.comment !== null)).toBe(true);
  });

  it('dates a legacy rated row through updatedAt', async () => {
    const professional = new ObjectId();
    const when = new Date(Date.now() - 2 * HOUR_MS);
    await seedReview({ professional, ratedAt: when, legacy: true });

    const { items } = await findProfessionalReviews({ professional });

    expect(items[0].ratedAt).toBe(when.toISOString());
  });

  it('masks a rater whose account is gone as a generic label', async () => {
    const professional = new ObjectId();
    await seedReview({ professional, reviewerName: null });

    const { items } = await findProfessionalReviews({ professional });

    expect(items[0].reviewer).toBe('A pet owner');
  });

  it('breaks ratings down per star, zero-filling and counting a double alongside ints', async () => {
    const professional = new ObjectId();
    await seedReview({ professional, rating: 1 });
    await seedReview({ professional, rating: 3 });
    await seedReview({ professional, rating: 5 });
    const asDouble = await seedReview({ professional, rating: 5 });
    // Force a BSON double so the $toInt bucketing is exercised, not just int32 storage.
    await appointmentsCollection().updateOne({ _id: asDouble }, [
      { $set: { rating: { $toDouble: 5 } } },
    ]);

    const breakdown = await ratingBreakdownForProfessional(professional);

    expect(breakdown).toEqual([1, 0, 1, 0, 2]);
  });

  it('narrows the list to a single star', async () => {
    const professional = new ObjectId();
    await seedReview({ professional, rating: 5 });
    await seedReview({ professional, rating: 5 });
    await seedReview({ professional, rating: 2 });

    const fives = await findProfessionalReviews({ professional, stars: 5 });

    expect(fives.total).toBe(2);
    expect(fives.items.every((review) => review.stars === 5)).toBe(true);
  });
});
