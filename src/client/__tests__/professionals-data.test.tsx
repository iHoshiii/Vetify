import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  professionalKeys,
  useApplyAsProfessional,
  useOwnApplication,
  useProfessionals,
} from '../hooks/useProfessionals';
import { listProfessionals } from '../services/professionals.service';

/** The hooks only read `isAuthenticated`, so the provider itself is not needed. */
const auth = { isAuthenticated: true };
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth }));

const PAGE = { items: [], page: 1, limit: 12, total: 0, pages: 1 };

const APPLICATION = {
  id: 'a1',
  userId: 'u1',
  licenseNumber: 'VET 1234-PH',
  licenseAuthority: 'Professional Regulation Commission',
  credentialUrls: ['https://example.com/licence.pdf'],
  specialties: ['dentistry'],
  clinicName: 'Bayside Animal Clinic',
  clinicAddress: '12 Mabini Street, Cebu City',
  bio: 'Long enough to pass the minimum the form asks for.',
  yearsExperience: 15,
  status: 'pending' as const,
  rejectionReason: null,
  reviewedAt: null,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
};

/** Stands in for fetch, so the hooks exercise the real service on the way down. */
function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

/** Each test gets its own cache, and a handle on it for the mutation assertions. */
function withClient() {
  // No gcTime override: a zero one drops an unobserved entry the moment it is
  // written, which is exactly what the mutation below writes and then reads.
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return { client, wrapper: Wrapper };
}

/** The path fetch was called with, minus the base URL. */
function requestedPath(fetchMock: ReturnType<typeof respond>): string {
  return String(fetchMock.mock.calls[0]?.[0]).replace('/api/v1', '');
}

beforeEach(() => {
  auth.isAuthenticated = true;
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listProfessionals', () => {
  it('asks for the bare directory when there is nothing to narrow it by', async () => {
    const fetchMock = respond(PAGE);
    vi.stubGlobal('fetch', fetchMock);

    await listProfessionals();

    // A '?page=1' on every first visit gives the same page a second cache key.
    expect(requestedPath(fetchMock)).toBe('/professionals');
  });

  it('carries page, limit and specialty through to the query string', async () => {
    const fetchMock = respond(PAGE);
    vi.stubGlobal('fetch', fetchMock);

    await listProfessionals({ page: 2, limit: 6, specialty: 'dentistry' });

    expect(requestedPath(fetchMock)).toBe('/professionals?page=2&limit=6&specialty=dentistry');
  });
});

describe('professionalKeys', () => {
  it('keys two different pages apart, and everything under the same root', () => {
    expect(professionalKeys.list({ page: 1 })).not.toEqual(professionalKeys.list({ page: 2 }));
    // An invalidation of professionalKeys.all has to reach the directory and the
    // caller's own application alike.
    expect(professionalKeys.mine().slice(0, 1)).toEqual([...professionalKeys.all]);
  });
});

describe('useProfessionals', () => {
  it('returns the page the API sent', async () => {
    vi.stubGlobal('fetch', respond({ ...PAGE, total: 1, items: [{ clinicName: 'Bayside' }] }));

    const { result } = renderHook(() => useProfessionals(), withClient());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });
});

describe('useOwnApplication', () => {
  it('reads a 404 as "has not applied" rather than as a failure', async () => {
    const fetchMock = respond(
      { error: 'You have not applied yet.', reason: 'no-application' },
      404
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useOwnApplication(), withClient());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The form branches on this being null. An error state would make it show a
    // retry button to somebody whose only problem is that they have not applied.
    expect(result.current.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns the application when there is one', async () => {
    vi.stubGlobal('fetch', respond(APPLICATION));

    const { result } = renderHook(() => useOwnApplication(), withClient());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('pending');
  });

  it('asks for nothing while nobody is signed in', () => {
    auth.isAuthenticated = false;
    const fetchMock = respond(APPLICATION);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useOwnApplication(), withClient());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useApplyAsProfessional', () => {
  it('posts the form and seeds the cache the status screen reads', async () => {
    const fetchMock = respond(APPLICATION, 201);
    vi.stubGlobal('fetch', fetchMock);

    const { client, wrapper } = withClient();
    const { result } = renderHook(() => useApplyAsProfessional(), { wrapper });

    result.current.mutate({
      licenseNumber: 'VET 1234-PH',
      licenseAuthority: 'Professional Regulation Commission',
      credentialUrls: ['https://example.com/licence.pdf'],
      clinicName: 'Bayside Animal Clinic',
      clinicAddress: '12 Mabini Street, Cebu City',
      bio: 'Long enough to pass the minimum the form asks for.',
      yearsExperience: 15,
      backgroundCheckConsent: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestedPath(fetchMock)).toBe('/professionals/apply');
    expect(init.method).toBe('POST');
    // Written straight in, so the pending screen renders without a second trip.
    expect(client.getQueryData(professionalKeys.mine())).toEqual(APPLICATION);
  });
});
