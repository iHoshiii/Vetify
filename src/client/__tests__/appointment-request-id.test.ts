import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AppointmentRequestInput } from '@shared/schemas';

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const input: AppointmentRequestInput = {
  professionalId: '507f1f77bcf86cd799439011',
  kind: 'onsite',
  startsAt: '2030-01-01T01:00:00.000Z',
  petName: 'Milo',
  petSpecies: 'Dog',
  reason: 'A rash that has not been settling down.',
  phone: '+639171234567',
};

it('uses one request ID for simultaneous attempts and creates a new ID after success', async () => {
  const { appointmentRequestId, finishAppointmentRequest } = await import(
    '../services/appointment-request-id'
  );
  const [first, second] = await Promise.all([
    appointmentRequestId(input),
    appointmentRequestId({ ...input }),
  ]);
  expect(first).toBe(second);
  finishAppointmentRequest(input, first);
  expect(await appointmentRequestId(input)).not.toBe(first);
});

it('retains an unfinished request across a page reload without storing the pet details', async () => {
  const firstModule = await import('../services/appointment-request-id');
  const first = await firstModule.appointmentRequestId(input);
  const saved = sessionStorage.getItem('vetify.booking-requests')!;
  expect(saved).not.toContain('Milo');
  expect(saved).not.toContain(input.reason);
  vi.resetModules();
  const reloaded = await import('../services/appointment-request-id');
  expect(await reloaded.appointmentRequestId(input)).toBe(first);
});

it('separates requests with different details and different signed-in accounts', async () => {
  const { appointmentRequestId } = await import('../services/appointment-request-id');
  const first = await appointmentRequestId(input);
  expect(await appointmentRequestId({ ...input, petName: 'Luna' })).not.toBe(first);
  localStorage.setItem(
    'vetify.auth',
    JSON.stringify({ accessToken: 'token', user: { id: 'another-user' } })
  );
  expect(await appointmentRequestId(input)).not.toBe(first);
});

it('keeps repeated clicks safe when browser storage cannot be written', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked');
  });
  const { appointmentRequestId } = await import('../services/appointment-request-id');
  const ids = await Promise.all([appointmentRequestId(input), appointmentRequestId(input)]);
  expect(ids[0]).toBe(ids[1]);
});
