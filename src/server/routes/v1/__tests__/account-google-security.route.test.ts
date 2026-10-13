import {
  app,
  begin,
  callback,
  oauth,
  PASSWORD,
  post,
  PROFILE,
  redirect,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { authIdentitiesCollection, listAuthIdentities } from '../../../models/auth-identities';
import { hashToken, refreshTokensCollection } from '../../../models/refresh-token';
import { insertUser, usersCollection } from '../../../models/users';
import { OAUTH_STATE_COOKIE, sealState } from '../../../services/oauth-state';

setupAccountDb();

describe('Google connection callback security', () => {
  it.each([{ email: 'other@example.com' }, { emailVerified: false }])(
    'requires the verified current account email (%j)',
    async (profile) => {
      const owner = await session();
      const flow = await begin(owner);
      oauth.profile.mockResolvedValue({ ...PROFILE, ...profile });
      expect(redirect(await callback(flow)).searchParams.get('accountAuthError')).toBe(
        'email-mismatch'
      );
      expect(await listAuthIdentities(owner.user._id)).toEqual([]);
    }
  );

  it('refuses a stable provider identity that already belongs to another account', async () => {
    const owner = await session();
    await insertUser({
      email: 'other@example.com',
      provider: 'google',
      providerId: PROFILE.providerId,
    });
    expect(redirect(await callback(await begin(owner))).searchParams.get('accountAuthError')).toBe(
      'identity-in-use'
    );
    expect(await listAuthIdentities(owner.user._id)).toEqual([]);
    expect((await usersCollection().findOne({ _id: owner.user._id }))?.provider).toBe('local');
  });

  it('handles provider cancellation without connecting an identity', async () => {
    const flow = await begin(await session());
    expect(
      redirect(await callback(flow, { error: 'access_denied' })).searchParams.get(
        'accountAuthError'
      )
    ).toBe('denied');
    expect(oauth.profile).not.toHaveBeenCalled();
    expect(await authIdentitiesCollection().countDocuments()).toBe(0);
  });

  it('rejects a tampered cookie, state substitution, wrong provider, and expired signed state', async () => {
    const owner = await session();
    const flow = await begin(owner);
    const invalid = [
      { cookie: flow.stateCookie.slice(0, -1) + 'x', state: flow.state, provider: 'google' },
      { cookie: flow.stateCookie, state: 'forged-state', provider: 'google' },
      { cookie: flow.stateCookie, state: flow.state, provider: 'facebook' },
    ];
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() - 11 * 60_000);
    const expired = sealState('google', flow.state, 'verifier', undefined, flow.sealed.accountAuth);
    clock.mockRestore();
    invalid.push({
      cookie: `${OAUTH_STATE_COOKIE}=${expired}`,
      state: flow.state,
      provider: 'google',
    });
    for (const attempt of invalid) {
      const response = await request(app)
        .get(`/api/v1/auth/${attempt.provider}/callback`)
        .set('Cookie', [attempt.cookie, owner.refreshCookie])
        .query({ state: attempt.state, code: 'provider-code' });
      const url = redirect(response);
      expect(url.searchParams.get('accountAuthError') ?? url.searchParams.get('reason')).toBe(
        'state'
      );
    }
    expect(oauth.profile).not.toHaveBeenCalled();
    expect(await listAuthIdentities(owner.user._id)).toEqual([]);
  });

  it('ignores query-string linking purposes on a regular OAuth callback', async () => {
    const owner = await session();
    const browser = request.agent(app);
    const start = await browser.get('/api/v1/auth/google');
    const state = new URL(start.headers.location as string).searchParams.get('state');
    const response = await browser.get('/api/v1/auth/google/callback').query({
      state,
      code: 'provider-code',
      purpose: 'connect-provider',
      userId: owner.user._id.toHexString(),
    });
    expect(redirect(response).searchParams.get('reason')).toBe('account-link-required');
    expect(await listAuthIdentities(owner.user._id)).toEqual([]);
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it.each(['logout', 'revoked', 'switched'] as const)(
    'rejects a %s session during the provider round trip',
    async (change) => {
      const owner = await session();
      const flow = await begin(owner);
      let refreshCookie = owner.refreshCookie;
      if (change === 'logout') await owner.browser.post('/api/v1/auth/logout');
      if (change === 'revoked')
        await refreshTokensCollection().updateOne(
          { tokenHash: hashToken(owner.rawRefresh) },
          { $set: { revokedAt: new Date() } }
        );
      if (change === 'switched')
        refreshCookie = (await session('local', 'other@example.com')).refreshCookie;
      const response =
        change === 'logout'
          ? await callback(flow)
          : await request(app)
              .get('/api/v1/auth/google/callback')
              .set('Cookie', [flow.stateCookie, refreshCookie])
              .query({ state: flow.state, code: 'provider-code' });
      expect(redirect(response).searchParams.get('accountAuthError')).toBe('session-expired');
      expect(await listAuthIdentities(owner.user._id)).toEqual([]);
    }
  );

  it('does not start Google connection when provider configuration is unavailable', async () => {
    const owner = await session();
    oauth.configured = false;
    const response = await post(owner, 'google', { currentPassword: PASSWORD });
    expect(response.status).toBe(501);
    expect(response.body.url).toBeUndefined();
  });
});
