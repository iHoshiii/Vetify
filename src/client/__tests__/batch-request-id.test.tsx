import { webcrypto } from 'node:crypto';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AppointmentRequestInput } from '@shared/schemas';
import { apiFetch, ApiError } from '../services/api';
import type { RequestResult } from '../services/appointments.service';
import {
  PartialRequestError,
  useBatchRequest,
} from '../pages/book-appointment/_components/use-batch-request';

vi.mock('../services/api', async (original) => ({
  ...(await original<typeof import('../services/api')>()),
  apiFetch: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(apiFetch).mockReset();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('crypto', webcrypto);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function input(time = '2030-01-01T01:00:00.000Z'): AppointmentRequestInput {
  return {
    professionalId: '507f1f77bcf86cd799439011',
    kind: 'onsite',
    startsAt: time,
    petName: 'Milo',
    petSpecies: 'Dog',
    reason: `A rash ${webcrypto.randomUUID()}`,
    phone: '+639171234567',
  };
}
const saved = {
  appointment: { id: 'saved' },
  mail: { professional: { delivered: true, deliveryError: null } },
} as RequestResult;

function hook() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBatchRequest(), { wrapper });
}
function requestId(call: number) {
  const options = vi.mocked(apiFetch).mock.calls[call][1];
  return new Headers(options?.headers).get('Idempotency-Key');
}

it('uses new IDs when a partial slot conflict sends the owner back to choose a fresh booking', async () => {
  const { result } = hook();
  const first = input();
  const second = { ...first, startsAt: '2030-01-01T02:00:00.000Z' };
  vi.mocked(apiFetch)
    .mockResolvedValueOnce(saved)
    .mockRejectedValueOnce(new ApiError(409, 'Taken', 'slot-taken'));
  await act(async () => {
    await expect(result.current.mutateAsync([first, second])).rejects.toBeInstanceOf(
      PartialRequestError
    );
  });
  const oldId = requestId(0);
  vi.mocked(apiFetch).mockResolvedValueOnce(saved);
  await act(async () => {
    await result.current.mutateAsync([first]);
  });
  expect(requestId(2)).not.toBe(oldId);
});

it('keeps IDs for uncertain retries, then creates fresh IDs after explicit abandonment', async () => {
  const { result } = hook();
  const first = input();
  const second = { ...first, startsAt: '2030-01-01T02:00:00.000Z' };
  vi.mocked(apiFetch)
    .mockResolvedValueOnce(saved)
    .mockRejectedValueOnce(new TypeError('Connection lost'));
  await act(async () => {
    await expect(result.current.mutateAsync([first, second])).rejects.toThrow('Connection lost');
  });
  const ids = [requestId(0), requestId(1)];
  vi.mocked(apiFetch)
    .mockResolvedValueOnce(saved)
    .mockRejectedValueOnce(new TypeError('Connection lost again'));
  await act(async () => {
    await expect(result.current.mutateAsync([first, second])).rejects.toThrow(
      'Connection lost again'
    );
  });
  expect([requestId(2), requestId(3)]).toEqual(ids);
  act(() => {
    result.current.reset();
  });
  vi.mocked(apiFetch).mockResolvedValueOnce(saved).mockResolvedValueOnce(saved);
  await act(async () => {
    await result.current.mutateAsync([first, second]);
  });
  expect(requestId(4)).not.toBe(ids[0]);
  expect(requestId(5)).not.toBe(ids[1]);
});
