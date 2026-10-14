import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { createApp } from '../../../app';
import * as models from '../../../models';
import { signAccessToken } from '../../../services/auth.service';
import { bookingFixture } from '../../../services/__tests__/appointment-reliability-fixtures';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

it('reports a saved booking successfully when its optional display lookup fails and repeats safely', async () => {
  const fixture = await bookingFixture();
  const token = signAccessToken({
    sub: fixture.owner._id.toString(),
    email: fixture.owner.email,
    role: fixture.owner.role ?? 'user',
    sessionVersion: fixture.owner.sessionVersion ?? 0,
  });
  const requestId = randomUUID();
  vi.spyOn(models, 'findUsersByIds').mockRejectedValueOnce(new Error('Display lookup failed'));
  const body = {
    professionalId: fixture.professional._id.toString(),
    kind: 'onsite',
    startsAt: fixture.startsAt.toISOString(),
    petName: 'Milo',
    petSpecies: 'Dog',
    reason: fixture.input.reason,
    phone: fixture.input.phone,
    clientEmail: fixture.owner.email,
  };
  const first = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', requestId)
    .send(body);
  expect(first.status).toBe(201);
  expect(first.body.appointment).toMatchObject({ status: 'requested', with: null });
  const repeated = await request(app)
    .post('/api/v1/appointments')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', requestId)
    .send(body);
  expect(repeated.status).toBe(201);
  expect(repeated.body.appointment.id).toBe(first.body.appointment.id);
  expect(await models.appointmentsCollection().countDocuments()).toBe(1);
  expect(repeated.body.appointment.with.id).toBe(fixture.vet._id.toString());
});
