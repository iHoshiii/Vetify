import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  professionalKeys,
  useApplyThroughInvite,
  useInvite,
  useOwnApplication,
  useProfessionals,
  useSendInquiry,
} from '../hooks/useProfessionals';
import { ApiError } from '../services/api';
import { listProfessionals } from '../services/professionals.service';

/** The hooks only read `isAuthenticated`, so the provider itself is not needed. */
const auth = { isAuthenticated: true };
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => auth }));

const PAGE = { items: [], page: 1, limit: 12, total: 0, pages: 1 };

const APPLICATION = {
  id: 'a1',
  userId: 'u1',
  fullName: 'Marites Reyes',
  licenseNumber: 'VET 1234-PH',
  licenseAuthority: 'Professional Regulation Commission',
  credentialUrls: ['https://example.com/licence.pdf'],
  specialties: ['dentistry'],
  clinicName: 'Bayside Animal Clinic',
  clinicAddress: '12 Mabini Street, Cebu City',
  addresses: [],
  businessPhone: null,
  bio: 'Long enough to pass the minimum the form asks for.',
  yearsExperience: 15,
  status: 'pending' as const,
  captures: { portrait: 'c1' },
  interviewAt: null,
  interviewNote: null,
  rejectionReason: null,
  reviewedAt: null,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
};

const INVITE = {
  name: 'Marites Reyes',
  email: 'marites@clinic.ph',
  licenseNumber: 'VET 1234-PH',
  currentLocation: 'Cebu City, Cebu',
  clinicLocation: null,
  expiresAt: '2026-09-10T00:00:00.000Z',
};

/** A complete application payload, which the invited mutation posts as-is. */
const FORM = {
  fullName: 'Marites Reyes',
  licenseNumber: 'VET 1234-PH',
  licenseAuthority: 'Professional Regulation Commission',
  credentialUrls: ['https://example.com/licence.pdf'],
  clinicName: 'Bayside Animal Clinic',
  addresses: [
    {
      kind: 'clinic' as const,
      line1: '12 Mabini Street',
      city: 'Cebu City',
      province: 'Cebu',
    },
  ],
  portrait: {
    data: 'aGk=',
    mimeType: 'image/jpeg' as const,
    capturedAt: '2026-08-27T00:00:00.000Z',
  },
  licenseFront: {
    data: 'aGk=',
    mimeType: 'image/jpeg' as const,
    capturedAt: '2026-08-27T00:00:00.000Z',
  },
  licenseBack: {
    data: 'aGk=',
    mimeType: 'image/jpeg' as const,
    capturedAt: '2026-08-27T00:00:00.000Z',
  },
  bio: 'Long enough to pass the minimum the form asks for.',
  yearsExperience: 15,
  backgroundCheckConsent: true,
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

describe('useSendInquiry', () => {
  it('posts the short form and keeps nothing', async () => {
    const fetchMock = respond({ received: true }, 201);
    vi.stubGlobal('fetch', fetchMock);

    const { client, wrapper } = withClient();
    const { result } = renderHook(() => useSendInquiry(), { wrapper });

    result.current.mutate({
      name: 'Marites Reyes',
      email: 'marites@clinic.ph',
      licenseNumber: 'VET 1234-PH',
      currentLocation: 'Cebu City, Cebu',
      motivation: 'Fifteen years of small animal practice and nowhere to write any of it down.',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestedPath(fetchMock)).toBe('/professionals/inquiries');
    expect(init.method).toBe('POST');
    // There is nothing to cache: what happens next arrives by email.
    expect(client.getQueryData(professionalKeys.mine())).toBeUndefined();
  });
});

describe('useInvite', () => {
  it('reads the invitation the emailed token opens', async () => {
    const fetchMock = respond(INVITE);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useInvite('a'.repeat(64)), withClient());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestedPath(fetchMock)).toBe(`/professionals/invites/${'a'.repeat(64)}`);
    expect(result.current.data?.email).toBe('marites@clinic.ph');
  });

  it('keeps the refusal reason, and does not ask twice', async () => {
    const fetchMock = respond({ error: 'That link has expired.', reason: 'expired' }, 410);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useInvite('b'.repeat(64)), withClient());

    await waitFor(() => expect(result.current.isError).toBe(true));
    // The page renders one of four sentences off this, so it has to survive the
    // hook; and a 410 will not become a 200 on a retry.
    expect((result.current.error as ApiError).reason).toBe('expired');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing without a token', () => {
    const fetchMock = respond(INVITE);
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() => useInvite(undefined), withClient());

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useApplyThroughInvite', () => {
  it('posts through the link, seeds the status cache, and drops the invitation', async () => {
    const fetchMock = respond(APPLICATION, 201);
    vi.stubGlobal('fetch', fetchMock);

    const token = 'c'.repeat(64);
    const { client, wrapper } = withClient();
    // Something in the cache to be dropped, as a page that read the link would have.
    client.setQueryData(professionalKeys.invite(token), INVITE);

    const { result } = renderHook(() => useApplyThroughInvite(token), { wrapper });

    result.current.mutate(FORM);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestedPath(fetchMock)).toBe(`/professionals/invites/${token}/apply`);
    expect(init.method).toBe('POST');
    // Written straight in, so the status screen renders without a second trip.
    expect(client.getQueryData(professionalKeys.mine())).toEqual(APPLICATION);
    // And the invitation is spent, so keeping it would only mislead the next render.
    expect(client.getQueryData(professionalKeys.invite(token))).toBeUndefined();
  });
});
