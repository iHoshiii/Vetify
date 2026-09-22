import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '@/services/api';

const KEY = 'vetify.auth';
const user = {
  id: 'u1',
  email: 'u@e.com',
  name: 'U',
  provider: 'local',
  avatarUrl: null,
  emailVerified: true,
  role: 'user',
};

function store(token: string) {
  window.localStorage.setItem(KEY, JSON.stringify({ accessToken: token, user }));
}

function res(status: number, body: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('apiFetch refresh-on-401', () => {
  it('refreshes once off the cookie and replays the request', async () => {
    store('expired');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, { error: 'nope', reason: 'unauthenticated' }))
      .mockResolvedValueOnce(res(200, { accessToken: 'fresh', user }))
      .mockResolvedValueOnce(res(200, { items: [{ id: 'm1' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await apiFetch<{ items: unknown[] }>('/messages/mine');

    expect(data.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // the replay carried the refreshed token
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh');
    expect(JSON.parse(window.localStorage.getItem(KEY)!).accessToken).toBe('fresh');
  });

  it('does not attempt refresh for an auth route itself', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, { error: 'bad', reason: 'unauthenticated' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears the session and surfaces the 401 when refresh fails', async () => {
    store('expired');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(401, { error: 'nope', reason: 'unauthenticated' }))
      .mockResolvedValueOnce(res(401, { error: 'cookie gone' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/messages/mine')).rejects.toMatchObject({ status: 401 });
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});
