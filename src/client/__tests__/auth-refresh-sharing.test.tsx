import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSession } from '@/lib/auth';
import { readAuthState, writeAuthState, type AuthSession } from '@/lib/auth-storage';
import { apiFetch } from '@/services/api';

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

function response(status: number, body: unknown): Response {
  return { status, ok: status < 400, json: async () => body } as Response;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('shared session refresh', () => {
  it('shares startup and automatic retry requests in one tab', async () => {
    let finish!: (value: Response) => void;
    let calls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/auth/refresh'))
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return Promise.resolve(++calls === 1 ? response(401, {}) : response(200, { saved: true }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const startup = refreshSession();
    const retry = apiFetch('/messages/mine');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    finish(response(200, session));
    await expect(startup).resolves.toEqual(session);
    await expect(retry).resolves.toEqual({ saved: true });
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('cannot restore a session when logout happens during refresh', async () => {
    writeAuthState(session);
    let finish!: (value: Response) => void;
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
    finish(response(200, session));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(readAuthState()).toBeNull();
  });

  it('cannot revive a sign-in while queued behind another tab', async () => {
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
    writeAuthState(null);
    grant();
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the browser lock when available', async () => {
    const requestLock = vi.fn((_name: string, callback: () => Promise<AuthSession>) => callback());
    vi.stubGlobal('navigator', { locks: { request: requestLock } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, session)));
    await refreshSession();
    expect(requestLock).toHaveBeenCalledWith('vetify.auth.refresh', expect.any(Function));
  });
});
