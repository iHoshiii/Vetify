import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import { readAuthState, writeAuthState, type AuthSession } from '@/lib/auth-storage';
import VerifyEmailPage from '@/pages/email-verification/verify-email-page';

const token = 'a'.repeat(64);
const session: AuthSession = {
  accessToken: 'stored-token',
  user: {
    id: 'signed-in-owner',
    email: 'owner@example.test',
    name: 'Owner',
    provider: 'local',
    avatarUrl: null,
    emailVerified: false,
    role: 'user',
  },
};
let verified = false;
const fetchMock = vi.fn();

function CurrentStatus() {
  const { user, status } = useAuth();
  return (
    <output>
      {user?.id}: {user?.emailVerified ? 'verified' : 'pending'} ({status})
    </output>
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  verified = false;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/auth/refresh')) {
      return Response.json({
        ...session,
        accessToken: 'refreshed-token',
        user: { ...session.user, emailVerified: verified },
      });
    }
    if (url.endsWith('/auth/email-verification/confirm')) {
      return Response.json({ message: 'Email verified.', verified: true });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  writeAuthState(session, false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

async function draw() {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[`/verify-email#token=${token}`]}>
        <VerifyEmailPage />
        <CurrentStatus />
      </MemoryRouter>
    </AuthProvider>
  );
  await screen.findByText('signed-in-owner: pending (authenticated)');
}

describe('verification session synchronization', () => {
  it('starts a fresh refresh after an older startup request settles', async () => {
    let finishStartup!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishStartup = resolve;
        })
    );
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/verify-email#token=${token}`]}>
          <VerifyEmailPage />
          <CurrentStatus />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(screen.getByText('signed-in-owner: pending (loading)')).toBeInTheDocument();
    verified = true;
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await screen.findByText('Email verified.');
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))
    ).toHaveLength(1);
    finishStartup(Response.json(session));
    await screen.findByText('signed-in-owner: verified (authenticated)');
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))
    ).toHaveLength(2);
    expect(readAuthState()?.user?.emailVerified).toBe(true);
  });

  it('refreshes the actual owner and updates auth storage after verification', async () => {
    await draw();
    verified = true;
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await screen.findByText('signed-in-owner: verified (authenticated)');
    expect(readAuthState()?.user?.emailVerified).toBe(true);
    expect(readAuthState()?.accessToken).toBe('refreshed-token');
  });

  it('does not mark the signed-in owner verified when the link belongs to a different account', async () => {
    await draw();
    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await screen.findByText('Email verified.');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))
      ).toHaveLength(2)
    );
    expect(screen.getByText('signed-in-owner: pending (authenticated)')).toBeInTheDocument();
    expect(readAuthState()?.user).toMatchObject({ id: 'signed-in-owner', emailVerified: false });
  });
});
