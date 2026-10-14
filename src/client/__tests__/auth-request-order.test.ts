import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginWithEmail, logoutFromServer, refreshSession, resetPassword } from '@/lib/auth';
import { readAuthState, writeAuthState, type AuthSession } from '@/lib/auth-storage';

const session: AuthSession = {
  accessToken: 'old',
  user: {
    id: 'owner',
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

function response(payload: unknown): Response {
  return { status: 200, ok: true, json: async () => payload } as Response;
}

describe('browser authentication request order', () => {
  it('orders refresh, logout, recovery, and new sign-in so their shared cookie changes cannot overlap', async () => {
    let tail: Promise<unknown> = Promise.resolve();
    const requestLock = vi.fn((_name: string, callback: () => Promise<unknown>) => {
      const result = tail.then(callback);
      tail = result.catch(() => undefined);
      return result;
    });
    vi.stubGlobal('navigator', { locks: { request: requestLock } });
    let finishRefresh!: (result: Response) => void;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/refresh'))
        return new Promise<Response>((resolve) => {
          finishRefresh = resolve;
        });
      return Promise.resolve(
        response(
          url.endsWith('/auth/login') ? { ...session, accessToken: 'new' } : { loggedOut: true }
        )
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    writeAuthState(session);
    const refresh = refreshSession().catch((error) => error);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const logout = logoutFromServer();
    const reset = resetPassword({
      token: 'a'.repeat(64),
      password: 'N3wPassword!',
      confirmPassword: 'N3wPassword!',
    });
    const login = loginWithEmail(session.user.email, 'N3wPassword!');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finishRefresh(response(session));
    await refresh;
    await logout;
    await reset;
    await login;
    expect(fetchMock.mock.calls.map(([url]) => url.split('/').at(-1))).toEqual([
      'refresh',
      'logout',
      'reset-password',
      'login',
    ]);
    expect(readAuthState()?.accessToken).toBe('new');
  });
});
