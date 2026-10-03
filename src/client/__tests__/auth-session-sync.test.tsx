import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import {
  AUTH_LOGOUT_KEY,
  readAuthState,
  writeAuthState,
  type AuthSession,
} from '@/lib/auth-storage';

const session: AuthSession = {
  accessToken: 'fresh',
  user: {
    id: 'user1',
    email: 'owner@example.com',
    name: 'Owner',
    provider: 'local',
    avatarUrl: null,
    emailVerified: true,
    role: 'user',
  },
};
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function SessionView() {
  const auth = useAuth();
  return <p>{auth.accessToken ?? 'signed out'}</p>;
}

async function renderSession() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ status: 200, ok: true, json: async () => session })
  );
  await act(async () => {
    render(
      <AuthProvider>
        <SessionView />
      </AuthProvider>
    );
  });
}

function otherTabLogout() {
  window.dispatchEvent(
    new StorageEvent('storage', { key: AUTH_LOGOUT_KEY, newValue: 'other-tab' })
  );
}

describe('session updates', () => {
  it('updates refreshed sessions and clears a tab-local sign-in when another tab logs out', async () => {
    writeAuthState(session, false);
    await renderSession();
    act(() => writeAuthState({ ...session, accessToken: 'renewed' }));
    expect(screen.getByText('renewed')).toBeDefined();
    act(otherTabLogout);
    expect(screen.getByText('signed out')).toBeDefined();
    expect(readAuthState()).toBeNull();
  });

  it('does not erase a new shared sign-in when an older logout event arrives late', async () => {
    writeAuthState(session, false);
    await renderSession();
    act(() => {
      writeAuthState({ ...session, accessToken: 'new-login' }, true);
      otherTabLogout();
    });
    expect(screen.getByText('new-login')).toBeDefined();
    expect(readAuthState()?.accessToken).toBe('new-login');
  });
});
