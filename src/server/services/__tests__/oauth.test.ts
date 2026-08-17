import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import {
  OAUTH_STATE_COOKIE,
  sealState,
  stateCookieOptions,
  statesMatch,
  unsealState,
} from '../oauth-state';
import {
  buildAuthorizeUrl,
  createPkcePair,
  isOAuthProviderName,
  redirectUriFor,
  type ProviderConfig,
} from '../oauth.service';

/** Built by hand so these assertions do not depend on a developer's .env. */
function fakeConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    clientId: 'client-id-123',
    clientSecret: 'client-secret-456',
    authorizeUrl: 'https://provider.example/authorize',
    tokenUrl: 'https://provider.example/token',
    scope: 'openid email',
    clientIdParam: 'client_id',
    fetchProfile: async () => ({
      providerId: 'p1',
      email: null,
      name: null,
      avatarUrl: null,
      emailVerified: false,
    }),
    ...overrides,
  };
}

describe('oauth provider names', () => {
  it('accepts the three configured providers and nothing else', () => {
    expect(isOAuthProviderName('google')).toBe(true);
    expect(isOAuthProviderName('facebook')).toBe(true);
    expect(isOAuthProviderName('tiktok')).toBe(true);
    expect(isOAuthProviderName('apple')).toBe(false);
    expect(isOAuthProviderName('__proto__')).toBe(false);
  });

  it('derives the callback URI from SERVER_URL', () => {
    expect(redirectUriFor('google')).toMatch(/\/api\/v1\/auth\/google\/callback$/);
  });
});

describe('PKCE', () => {
  it('derives the challenge as the base64url SHA-256 of the verifier', () => {
    const { verifier, challenge } = createPkcePair();
    const expected = crypto.createHash('sha256').update(verifier).digest('base64url');

    expect(challenge).toBe(expected);
    // base64url only — a raw base64 '+' or '/' would break the query string.
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('never repeats a verifier', () => {
    const seen = new Set(Array.from({ length: 50 }, () => createPkcePair().verifier));
    expect(seen.size).toBe(50);
  });
});

describe('buildAuthorizeUrl', () => {
  it('sends the state, challenge and S256 method', () => {
    const url = new URL(buildAuthorizeUrl('google', fakeConfig(), 'state-xyz', 'challenge-abc'));

    expect(url.origin + url.pathname).toBe('https://provider.example/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id-123');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email');
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-abc');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUriFor('google'));
  });

  it('never leaks the client secret into the authorize URL', () => {
    const url = buildAuthorizeUrl('google', fakeConfig(), 'state', 'challenge');
    expect(url).not.toContain('client-secret-456');
  });

  it('spells the identifier client_key for TikTok', () => {
    const url = new URL(
      buildAuthorizeUrl('tiktok', fakeConfig({ clientIdParam: 'client_key' }), 's', 'c')
    );

    expect(url.searchParams.get('client_key')).toBe('client-id-123');
    expect(url.searchParams.get('client_id')).toBeNull();
  });

  it('merges provider-specific extras', () => {
    const url = new URL(
      buildAuthorizeUrl(
        'google',
        fakeConfig({ authorizeExtras: { prompt: 'select_account' } }),
        's',
        'c'
      )
    );
    expect(url.searchParams.get('prompt')).toBe('select_account');
  });
});

describe('oauth state cookie', () => {
  it('round-trips the provider, state and verifier', () => {
    const sealed = sealState('google', 'state-1', 'verifier-1');
    const opened = unsealState(sealed);

    expect(opened).toMatchObject({
      provider: 'google',
      state: 'state-1',
      codeVerifier: 'verifier-1',
    });
  });

  it('rejects a tampered payload', () => {
    const sealed = sealState('google', 'state-1', 'verifier-1');
    const [encoded, signature] = sealed.split('.');
    const forged = Buffer.from(
      JSON.stringify({
        provider: 'google',
        state: 'attacker-state',
        codeVerifier: 'v',
        expiresAt: Date.now() + 60_000,
      }),
      'utf8'
    ).toString('base64url');

    expect(encoded).not.toBe(forged);
    expect(unsealState(`${forged}.${signature}`)).toBeNull();
  });

  it('rejects a truncated or absent signature', () => {
    const sealed = sealState('google', 's', 'v');
    expect(unsealState(sealed.slice(0, -4))).toBeNull();
    expect(unsealState(sealed.split('.')[0])).toBeNull();
    expect(unsealState('')).toBeNull();
    expect(unsealState(undefined)).toBeNull();
    expect(unsealState(42)).toBeNull();
  });

  it('rejects an expired cookie', () => {
    vi.useFakeTimers();
    try {
      const sealed = sealState('google', 's', 'v');
      expect(unsealState(sealed)).not.toBeNull();

      vi.advanceTimersByTime(11 * 60 * 1000);
      expect(unsealState(sealed)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps SameSite=Lax so the cookie survives the provider redirect back', () => {
    expect(stateCookieOptions.sameSite).toBe('lax');
    expect(stateCookieOptions.httpOnly).toBe(true);
    expect(OAUTH_STATE_COOKIE).toBe('vetify_oauth_state');
  });

  it('compares states without throwing on length mismatch', () => {
    expect(statesMatch('abcdef', 'abcdef')).toBe(true);
    expect(statesMatch('abcdef', 'abcdeg')).toBe(false);
    expect(statesMatch('abcdef', 'short')).toBe(false);
    expect(statesMatch('abcdef', undefined)).toBe(false);
  });
});
