import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSession } from '@/lib/auth';
import { readAuthState, writeAuthState, type AuthSession } from '@/lib/auth-storage';

const session: AuthSession = {
  accessToken: 'original-token',
  user: {
    id: 'original-owner',
    email: 'owner@example.test',
    name: 'Owner',
    provider: 'local',
    avatarUrl: null,
    emailVerified: false,
    role: 'user',
  },
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  writeAuthState(session, false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe('fresh session refresh while waiting', () => {
  it.each(['logout', 'account switch'])(
    'does not start another refresh after an %s',
    async (change) => {
      let finish!: (response: Response) => void;
      const fetchMock = vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          })
      );
      vi.stubGlobal('fetch', fetchMock);
      const startup = refreshSession().catch((cause) => cause);
      const fresh = refreshSession({ fresh: true }).catch((cause) => cause);
      const next =
        change === 'logout' ? null : { ...session, user: { ...session.user, id: 'next-owner' } };
      writeAuthState(next, false);
      finish(Response.json(session));
      expect(await startup).toMatchObject({ status: change === 'logout' ? 401 : 409 });
      expect(await fresh).toMatchObject({ status: change === 'logout' ? 401 : 409 });
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(readAuthState()).toEqual(next);
    }
  );
});
