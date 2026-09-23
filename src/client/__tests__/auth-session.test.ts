import { afterEach, describe, expect, it } from 'vitest';

import { landingFor, pendingAuthReturnTo } from '@/lib/auth';
import { readAuthState, writeAuthState, type AuthSession, type AuthUser } from '@/lib/auth-storage';

const user: AuthUser = {
  id: 'user-1',
  email: 'pet@example.com',
  name: 'Pet Owner',
  provider: 'local',
  avatarUrl: null,
  emailVerified: true,
  role: 'user',
};

const session: AuthSession = { accessToken: 'token', user };

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('authentication session storage', () => {
  it('keeps a remembered session across browser sessions', () => {
    writeAuthState(session, true);

    expect(window.localStorage.getItem('vetify.auth')).not.toBeNull();
    expect(window.sessionStorage.getItem('vetify.auth')).toBeNull();
    expect(readAuthState()).toEqual(session);
  });

  it('keeps an unremembered session in this tab only', () => {
    writeAuthState(session, false);

    expect(window.sessionStorage.getItem('vetify.auth')).not.toBeNull();
    expect(window.localStorage.getItem('vetify.auth')).toBeNull();
    expect(readAuthState()).toEqual(session);
  });

  it('preserves the chosen storage when a token is refreshed', () => {
    writeAuthState(session, false);
    writeAuthState({ ...session, accessToken: 'fresh-token' });

    expect(window.localStorage.getItem('vetify.auth')).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem('vetify.auth')!).accessToken).toBe(
      'fresh-token'
    );
  });
});

describe('authentication return routes', () => {
  it('returns to an internal guarded page', () => {
    expect(landingFor(user, '/book-appointment?vet=42')).toBe('/book-appointment?vet=42');
  });

  it('rejects external and protocol-relative destinations', () => {
    expect(landingFor(user, 'https://malicious.example')).toBe('/');
    expect(landingFor(user, '//malicious.example')).toBe('/');
  });

  it('ignores an unsafe pending OAuth destination', () => {
    window.sessionStorage.setItem('vetify.auth.returnTo', '//malicious.example');
    expect(pendingAuthReturnTo()).toBeNull();
  });
});
