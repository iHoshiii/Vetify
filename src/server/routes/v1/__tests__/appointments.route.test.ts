import { APPOINTMENT_SLOT_MINUTES, MANILA_UTC_OFFSET_HOURS } from '@shared/limits';
import type { WeeklyScheduleItem } from '@shared/schemas';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import {
  insertProfessional,
  insertUser,
  updateProfessional,
  updateProfessionalProfile,
} from '../../../models';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

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
 * A slot a fortnight out. Computed rather than pinned to a date, because the grid
 * drops anything already past and a hard-coded 2026 fixture is a suite that starts
 * failing on its own.
 */
function soon() {
  const manila = new Date(Date.now() + 14 * DAY_MS + MANILA_UTC_OFFSET_HOURS * HOUR_MS);
  const date = manila.toISOString().slice(0, 10);
  const [year, month, day] = date.split('-').map(Number);

  return {
    date,
    day: DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    at: new Date(Date.UTC(year, month - 1, day, 9 - MANILA_UTC_OFFSET_HOURS)).toISOString(),
  };
}

const SLOT = soon();

async function account() {
  seq += 1;
  const user = await insertUser({
    email: `owner${seq}@example.com`,
    password: 'Sup3rSecret!',
    name: `Pat Owner ${seq}`,
    provider: 'local',
  });

  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' }),
  };
}

/** A verified vet working the morning the slot above falls on. */
async function vet() {
  const owner = await account();
  seq += 1;

  const filed = await insertProfessional({
    user: owner.user._id,
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

  // Neither the schedule nor the availability is part of a filed application: they
  // are settings a verified vet chooses afterwards.
  await updateProfessionalProfile(filed._id, {
    availabilityStatus: 'available',
    weeklySchedule: [{ day: SLOT.day, enabled: true, startTime: '09:00', endTime: '11:00' }],
  });

  const application = await updateProfessional(filed._id, { status: 'verified' });
  return { ...owner, application: application! };
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'onsite',
    startsAt: SLOT.at,
    petName: 'Milo',
    petSpecies: 'Dog',
    reason: 'A rash on his back leg that is not settling down.',
    phone: '+63 32 555 0101',
    ...overrides,
  };
}

function book(token: string, professionalId: string, overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .send(body({ professionalId, ...overrides }));
}

describe('POST /api/v1/appointments', () => {
  it('refuses a booking from nobody in particular', async () => {
    const doctor = await vet();

    const res = await request(app)
      .post('/api/v1/appointments')
      .send(body({ professionalId: doctor.application._id.toString() }));

    expect(res.status).toBe(401);
  });

  it('books the slot and hands back the booking with the vet on it', async () => {
    const owner = await account();
    const doctor = await vet();

    const res = await book(owner.token, doctor.application._id.toString());

    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({
      status: 'requested',
      kind: 'onsite',
      startsAt: SLOT.at,
      minutes: APPOINTMENT_SLOT_MINUTES,
      petName: 'Milo',
    });
    // The other side of the booking, so the row can be drawn without a second read.
    expect(res.body.appointment.with.email).toBe(doctor.user.email);
    // Both emails reported: the vet not hearing is the failure worth acting on.
    expect(res.body.mail.professional.delivered).toBe(true);
    expect(res.body.mail.client.delivered).toBe(true);
  });

  it('says which slot went, so the page can redraw rather than apologise', async () => {
    const first = await account();
    const second = await account();
    const doctor = await vet();

    await book(first.token, doctor.application._id.toString());
    const res = await book(second.token, doctor.application._id.toString());

    expect(res.status).toBe(409);
    // Its own reason, so the client can redraw the grid and say "that one just went"
    // instead of "something went wrong".
    expect(res.body.reason).toBe('slot-taken');
  });

  it('refuses a time nobody was offered', async () => {
    const owner = await account();
    const doctor = await vet();

    const invented = new Date(new Date(SLOT.at).getTime() + 17 * 60_000).toISOString();
    const res = await book(owner.token, doctor.application._id.toString(), { startsAt: invented });

    expect(res.status).toBe(400);
  });

  it('answers 404 for a vet who is not in the directory', async () => {
    const owner = await account();

    const res = await book(owner.token, new ObjectId().toString());

    expect(res.status).toBe(404);
  });

  it('refuses a malformed id in the body without asking the database', async () => {
    const owner = await account();

    const res = await book(owner.token, 'not-an-id');

    expect(res.status).toBe(400);
    expect(res.body.issues.professionalId).toBeTruthy();
  });
});

describe('the two lists', () => {
  it('shows an owner their own bookings and no others', async () => {
    const owner = await account();
    const other = await account();
    const doctor = await vet();

    await book(owner.token, doctor.application._id.toString());

    const mine = await request(app)
      .get('/api/v1/appointments/mine')
      .set('Authorization', `Bearer ${owner.token}`);
    const theirs = await request(app)
      .get('/api/v1/appointments/mine')
      .set('Authorization', `Bearer ${other.token}`);

    expect(mine.body.total).toBe(1);
    // Scoped by the signed-in account rather than by a parameter, so there is no id
    // anybody could change to read somebody elses.
    expect(theirs.body.total).toBe(0);
  });

  it('shows a vet what has been booked with them', async () => {
    const owner = await account();
    const doctor = await vet();

    await book(owner.token, doctor.application._id.toString());

    const res = await request(app)
      .get('/api/v1/appointments/incoming')
      .set('Authorization', `Bearer ${doctor.token}`);

    expect(res.body.total).toBe(1);
    // The owner, on the vets list. The same field, read from the other side.
    expect(res.body.items[0].with.email).toBe(owner.user.email);
  });

  it('leaves a non-vet account with an empty list rather than a refusal', async () => {
    const owner = await account();

    // Which is why there is no role gate on it: the scoping is the gate.
    const res = await request(app)
      .get('/api/v1/appointments/incoming')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

describe('answering one', () => {
  it('lets the vet it belongs to confirm it', async () => {
    const owner = await account();
    const doctor = await vet();
    const booked = await book(owner.token, doctor.application._id.toString());

    const res = await request(app)
      .patch(`/api/v1/appointments/${booked.body.appointment.id}/confirm`)
      .set('Authorization', `Bearer ${doctor.token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('confirmed');
    expect(res.body.mail.delivered).toBe(true);
  });

  it('refuses a vet answering a booking that is not theirs', async () => {
    const owner = await account();
    const doctor = await vet();
    const other = await vet();
    const booked = await book(owner.token, doctor.application._id.toString());

    const res = await request(app)
      .patch(`/api/v1/appointments/${booked.body.appointment.id}/confirm`)
      .set('Authorization', `Bearer ${other.token}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('refuses an owner confirming their own request', async () => {
    const owner = await account();
    const doctor = await vet();
    const booked = await book(owner.token, doctor.application._id.toString());

    // Nobody takes a vets time without the vet agreeing to it.
    const res = await request(app)
      .patch(`/api/v1/appointments/${booked.body.appointment.id}/confirm`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('insists on a reason to turn one down', async () => {
    const owner = await account();
    const doctor = await vet();
    const booked = await book(owner.token, doctor.application._id.toString());

    const res = await request(app)
      .patch(`/api/v1/appointments/${booked.body.appointment.id}/decline`)
      .set('Authorization', `Bearer ${doctor.token}`)
      .send({ reason: 'no' });

    expect(res.status).toBe(400);
    expect(res.body.issues.reason).toBeTruthy();
  });

  it('lets either side cancel, and says which side did', async () => {
    const owner = await account();
    const doctor = await vet();
    const booked = await book(owner.token, doctor.application._id.toString());

    const res = await request(app)
      .patch(`/api/v1/appointments/${booked.body.appointment.id}/cancel`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ reason: 'Milo is much better, no need for the visit.' });

    expect(res.status).toBe(200);
    expect(res.body.appointment).toMatchObject({ status: 'cancelled', cancelledByYou: true });
  });

  it('answers a malformed id without asking the database', async () => {
    const doctor = await vet();

    const res = await request(app)
      .patch('/api/v1/appointments/not-an-id/confirm')
      .set('Authorization', `Bearer ${doctor.token}`)
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/professionals/:id/slots', () => {
  it('refuses an anonymous caller: when a vet is booked is not an advertisement', async () => {
    const doctor = await vet();

    const res = await request(app).get(
      `/api/v1/professionals/${doctor.application._id.toString()}/slots?from=${SLOT.date}`
    );

    expect(res.status).toBe(401);
  });

  it('draws the working window, and marks what is gone', async () => {
    const owner = await account();
    const doctor = await vet();
    const id = doctor.application._id.toString();

    await book(owner.token, id);

    const res = await request(app)
      .get(`/api/v1/professionals/${id}/slots?from=${SLOT.date}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    // The length comes back with the days, so the client labels every button from the
    // same number the grid was cut with.
    expect(res.body.minutes).toBe(APPOINTMENT_SLOT_MINUTES);
    expect(res.body.days).toHaveLength(1);

    const slots = res.body.days[0].slots as Array<{ at: string; taken: boolean }>;
    // 09:00 to 11:00 in half hours.
    expect(slots).toHaveLength(4);
    expect(slots.find((slot) => slot.at === SLOT.at)?.taken).toBe(true);
  });

  it('refuses a range that ends before it starts', async () => {
    const owner = await account();
    const doctor = await vet();

    const res = await request(app)
      .get(
        `/api/v1/professionals/${doctor.application._id.toString()}/slots?from=${
          SLOT.date
        }&to=2020-01-01`
      )
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(400);
  });

  it('answers 404 for a listing that is not in the directory', async () => {
    const owner = await account();

    const res = await request(app)
      .get(`/api/v1/professionals/${new ObjectId().toString()}/slots?from=${SLOT.date}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(404);
  });
});
