import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSession } from '@/lib/auth';
import { readAuthState, writeAuthState, type AuthSession } from '@/lib/auth-storage';
import { apiFetch } from '@/services/api';

const previous: AuthSession = {
  accessToken: 'old',
  user: {
    id: 'old-owner',
    email: 'old@example.com',
    name: 'Owner',
    provider: 'local',
    avatarUrl: null,
    emailVerified: true,
    role: 'user',
  },
};
const current = { ...previous, accessToken: 'new', user: { ...previous.user, id: 'new-owner' } };
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('refresh after changing accounts', () => {
  it('does not refresh an old account after waiting for another tab', async () => {
    writeAuthState(previous);
    let grant!: () => void;
    const requestLock = vi.fn(
      (_name: string, callback: () => Promise<AuthSession>) =>
        new Promise<AuthSession>((resolve, reject) => {
          grant = () => {
            callback().then(resolve, reject);
          };
        })
    );
    vi.stubGlobal('navigator', { locks: { request: requestLock } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const pending = refreshSession();
    writeAuthState(current);
    grant();
    await expect(pending).rejects.toMatchObject({ status: 409, reason: 'account-changed' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readAuthState()).toEqual(current);
  });

  it('does not replace a new account with an old response arriving late', async () => {
    writeAuthState(previous);
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          })
      )
    );
    const pending = refreshSession();
    writeAuthState(current);
    finish({ status: 200, ok: true, json: async () => previous } as Response);
    await expect(pending).rejects.toMatchObject({ status: 409, reason: 'account-changed' });
    expect(readAuthState()).toEqual(current);
  });

  it('does not clear a new sign-in when an old refresh is refused', async () => {
    writeAuthState(previous);
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          })
      )
    );
    const pending = refreshSession();
    writeAuthState(null);
    writeAuthState(current);
    finish({
      status: 401,
      ok: false,
      json: async () => ({ error: 'Old session ended' }),
    } as Response);
    await expect(pending).rejects.toMatchObject({ status: 409, reason: 'account-changed' });
    expect(readAuthState()).toEqual(current);
  });

  it('does not replay a pending write for a different account', async () => {
    writeAuthState(previous);
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const pending = apiFetch('/meal-plans', { method: 'POST', body: { name: 'Old account plan' } });
    writeAuthState(current);
    finish({ status: 401, ok: false, json: async () => ({ error: 'Expired' }) } as Response);
    await expect(pending).rejects.toMatchObject({ status: 409, reason: 'account-changed' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(readAuthState()).toEqual(current);
  });
});
