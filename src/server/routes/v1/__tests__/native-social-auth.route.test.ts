import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { nativeSocialGrantsCollection } from '../../../models/native-social-grant';
import { refreshTokensCollection, hashToken } from '../../../models/refresh-token';
import { insertUser, updateUser, usersCollection } from '../../../models/users';
import {
  OAuthError,
  type OAuthProfile,
  type OAuthProviderName,
} from '../../../services/oauth.service';
import { OAUTH_STATE_COOKIE, sealState, unsealState } from '../../../services/oauth-state';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { NATIVE_CLIENT_ID, NATIVE_SOCIAL_REDIRECT_URI } from '../../../../shared/native-auth';

const mocks = vi.hoisted(() => ({ configured: true, profile: vi.fn() }));
vi.mock('../../../services/oauth.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/oauth.service')>()),
  getProviderConfig: () =>
    mocks.configured
      ? {
          clientId: 'test-provider-client',
          clientSecret: 'test-provider-secret',
          authorizeUrl: 'https://provider.example/authorize',
          tokenUrl: 'https://provider.example/token',
          scope: 'email profile',
          clientIdParam: 'client_id',
          fetchProfile: mocks.profile,
        }
      : null,
  fetchProfileFromCode: mocks.profile,
}));

const app = createApp();
const CLIENT = { clientId: NATIVE_CLIENT_ID, redirectUri: NATIVE_SOCIAL_REDIRECT_URI } as const;
const verifier = 'a'.repeat(64);
const context = {
  ...CLIENT,
  state: 'b'.repeat(32),
  codeChallenge: crypto.createHash('sha256').update(verifier).digest('base64url'),
};
const profile: OAuthProfile = {
  providerId: 'provider-owner',
  email: 'owner@example.com',
  name: 'OAuth Owner',
  avatarUrl: null,
  emailVerified: true,
};
const start = (body: object) => request(app).post('/api/v1/auth/native/oauth/start').send(body);
const exchange = (code: string, codeVerifier = verifier) =>
  request(app)
    .post('/api/v1/auth/native/oauth/exchange')
    .send({ ...CLIENT, code, codeVerifier });

async function begin(provider: OAuthProviderName = 'google') {
  const response = await start({ ...context, provider });
  expect(response.status).toBe(200);
  const url = new URL(response.body.url as string);
  expect(url.origin).toBe(new URL(env.SERVER_URL).origin);
  expect(url.pathname).toBe(`/api/v1/auth/${provider}`);
  const browser = request.agent(app);
  const navigation = await browser.get(`${url.pathname}${url.search}`);
  expect(navigation.status).toBe(302);
  const providerState = new URL(navigation.headers.location as string).searchParams.get('state')!;
  const cookies = navigation.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((item) => item.startsWith(`${OAUTH_STATE_COOKIE}=`))!.split(';')[0];
  return { browser, provider, providerState, cookie };
}
async function complete(provider: OAuthProviderName = 'google') {
  const flow = await begin(provider);
  const callback = await flow.browser
    .get(`/api/v1/auth/${provider}/callback`)
    .query({ code: 'provider-one-use-code', state: flow.providerState });
  return { ...flow, callback, url: new URL(callback.headers.location as string) };
}

beforeAll(startTestDb, 120_000);
beforeEach(() => {
  mocks.configured = true;
  mocks.profile.mockReset().mockResolvedValue(profile);
});
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('Native social sign-in', () => {
  it.each(['google', 'facebook', 'tiktok'] as const)(
    'uses the existing %s identity and sends only a PKCE-bound code into the app',
    async (provider) => {
      if (provider === 'tiktok') {
        await insertUser({
          email: profile.email!,
          name: profile.name,
          provider,
          providerId: profile.providerId,
        });
        mocks.profile.mockResolvedValue({ ...profile, email: null, emailVerified: false });
      }
      const flow = await complete(provider);
      expect(flow.url.protocol).toBe('vetify-planner:');
      expect(flow.url.hostname).toBe('auth');
      expect(flow.url.pathname).toBe('/social');
      expect([...flow.url.searchParams.keys()].sort()).toEqual(['code', 'state']);
      expect(flow.url.searchParams.get('state')).toBe(context.state);
      const code = flow.url.searchParams.get('code')!;
      expect(code).toMatch(/^[a-f0-9]{64}$/);
      const grants = await nativeSocialGrantsCollection().find().toArray();
      expect(grants).toHaveLength(1);
      expect(grants[0].codeHash).toBe(hashToken(code));
      expect(grants[0].codeChallenge).toBe(context.codeChallenge);
      expect(grants[0].expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 60_000);
      expect(grants[0].cleanupAt.getTime()).toBeGreaterThan(Date.now() + 10 * 60_000);
      expect(JSON.stringify(grants[0])).not.toContain(code);
      expect(await refreshTokensCollection().countDocuments()).toBe(0);
      const callbackCookies = flow.callback.headers['set-cookie'] as unknown as string[];
      expect(
        callbackCookies.some((cookie) => cookie.startsWith(`${env.REFRESH_COOKIE_NAME}=`))
      ).toBe(false);
      const session = await exchange(code);
      expect(session.status).toBe(200);
      expect(session.headers['set-cookie']).toBeUndefined();
      expect(session.body.user.email).toBe(profile.email);
      expect(session.body.user.role).toBe('user');
      expect(session.body.refreshToken).toMatch(/^[a-f0-9]{64}$/);
      expect(typeof session.body.accessToken).toBe('string');
    }
  );

  it('seals app state and proof separately from the provider nonce and verifier', async () => {
    const flow = await begin();
    const sealed = unsealState(flow.cookie.slice(`${OAUTH_STATE_COOKIE}=`.length));
    expect(sealed?.native).toEqual(context);
    expect(sealed?.state).toBe(flow.providerState);
    expect(sealed?.state).not.toBe(context.state);
    expect(sealed?.codeVerifier).not.toBe(verifier);
    expect(mocks.profile).not.toHaveBeenCalled();
  });

  it('rejects unconfigured providers before the browser is opened', async () => {
    mocks.configured = false;
    const response = await start({ ...context, provider: 'google' });
    expect(response.status).toBe(503);
    expect(response.body.reason).toBe('unconfigured');
    expect(response.body.url).toBeUndefined();
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('rejects arbitrary clients, redirects, invalid proofs and unknown fields', async () => {
    const invalid = [
      { ...context, provider: 'other' },
      { ...context, provider: 'google', clientId: 'another-client' },
      { ...context, provider: 'google', redirectUri: 'https://attacker.example/callback' },
      { ...context, provider: 'google', state: 'short' },
      { ...context, provider: 'google', codeChallenge: 'invalid' },
      { ...context, provider: 'google', role: 'admin' },
    ];
    for (const body of invalid) expect((await start(body)).status).toBe(400);
    expect(
      (
        await request(app)
          .get('/api/v1/auth/google')
          .query({ nativeRedirectUri: 'https://attacker.example' })
      ).status
    ).toBe(400);
    expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
  });

  it('returns cancellation to the fixed app URI only after checking the signed provider state', async () => {
    const flow = await begin();
    const denied = await flow.browser
      .get('/api/v1/auth/google/callback')
      .query({ state: flow.providerState, error: 'access_denied' });
    const result = new URL(denied.headers.location as string);
    expect(result.href).toBe(`${NATIVE_SOCIAL_REDIRECT_URI}?state=${context.state}&error=denied`);
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
    const forged = await request(app)
      .get('/api/v1/auth/google/callback')
      .set('Cookie', flow.cookie)
      .query({
        state: 'forged-state',
        error: 'access_denied',
        redirectUri: 'https://attacker.example',
      });
    expect(new URL(forged.headers.location as string).origin).toBe(
      new URL(env.OAUTH_FAILURE_REDIRECT).origin
    );
  });

  it('rejects a tampered cookie, missing state, wrong provider, and expired signed state', async () => {
    const flow = await begin();
    const invalid = [
      { cookie: flow.cookie.slice(0, -1) + 'x', state: flow.providerState, provider: 'google' },
      { cookie: flow.cookie, state: undefined, provider: 'google' },
      { cookie: flow.cookie, state: flow.providerState, provider: 'facebook' },
      {
        cookie: `${OAUTH_STATE_COOKIE}=${sealState('google', flow.providerState, 'v', {
          ...context,
          redirectUri: 'https://attacker.example',
        } as unknown as typeof context)}`,
        state: flow.providerState,
        provider: 'google',
      },
    ];
    for (const input of invalid) {
      const response = await request(app)
        .get(`/api/v1/auth/${input.provider}/callback`)
        .set('Cookie', input.cookie)
        .query({ code: 'provider-code', state: input.state });
      expect(new URL(response.headers.location as string).searchParams.get('reason')).toBe('state');
    }
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now - 11 * 60_000);
    const expired = sealState('google', flow.providerState, 'v', context);
    clock.mockRestore();
    const response = await request(app)
      .get('/api/v1/auth/google/callback')
      .set('Cookie', `${OAUTH_STATE_COOKIE}=${expired}`)
      .query({ code: 'provider-code', state: flow.providerState });
    expect(new URL(response.headers.location as string).searchParams.get('reason')).toBe('state');
    expect(mocks.profile).not.toHaveBeenCalled();
    expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
  });

  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'refuses a %s account at the provider callback',
    async (status) => {
      const user = await insertUser({
        email: profile.email!,
        name: profile.name,
        provider: 'google',
        providerId: profile.providerId,
      });
      await updateUser(user._id, { status });
      const flow = await complete();
      expect(flow.url.searchParams.get('error')).toBe('blocked');
      expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
      expect(await refreshTokensCollection().countDocuments()).toBe(0);
    }
  );

  it('requires email registration for a new TikTok profile without inventing an address', async () => {
    mocks.profile.mockResolvedValue({ ...profile, email: null, emailVerified: false });
    const flow = await complete('tiktok');
    expect(flow.url.searchParams.get('error')).toBe('signup-required');
    expect(await usersCollection().countDocuments()).toBe(0);
    expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
  });

  it('returns safe provider and server errors using the trusted native context', async () => {
    mocks.profile.mockRejectedValueOnce(new OAuthError('Provider private details'));
    const providerFailure = await complete();
    expect(providerFailure.url.searchParams.get('error')).toBe('provider');
    expect(providerFailure.url.href).not.toContain('private');
    mocks.profile.mockRejectedValueOnce(new Error('Database private details'));
    const serverFailure = await complete();
    expect(serverFailure.url.searchParams.get('error')).toBe('server');
    expect(serverFailure.url.href).not.toContain('private');
  });

  it('leaves a grant usable after a wrong proof but rejects proof substitution and replay', async () => {
    const flow = await complete();
    const code = flow.url.searchParams.get('code')!;
    expect((await exchange(code, 'c'.repeat(64))).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/v1/auth/native/oauth/exchange')
          .send({
            ...CLIENT,
            code,
            codeVerifier: verifier,
            redirectUri: 'https://attacker.example',
          })
      ).status
    ).toBe(400);
    const session = await exchange(code);
    expect(session.status).toBe(200);
    expect((await exchange(code)).status).toBe(401);
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
  });

  it('atomically permits only one concurrent exchange', async () => {
    const flow = await complete();
    const code = flow.url.searchParams.get('code')!;
    const attempts = await Promise.all([exchange(code), exchange(code)]);
    expect(attempts.map((attempt) => attempt.status).sort()).toEqual([200, 401]);
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
  });

  it('expires grants after at most 60 seconds and checks current status at exchange', async () => {
    const flow = await complete();
    const code = flow.url.searchParams.get('code')!;
    await nativeSocialGrantsCollection().updateOne(
      { codeHash: hashToken(code) },
      { $set: { expiresAt: new Date(Date.now() - 1) } }
    );
    expect((await exchange(code)).status).toBe(401);
    const next = await complete();
    const grant = await nativeSocialGrantsCollection().findOne({
      codeHash: hashToken(next.url.searchParams.get('code')!),
    });
    await updateUser(grant!.user, { status: 'banned' });
    expect((await exchange(next.url.searchParams.get('code')!)).status).toBe(403);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
  });

  it('prevents replaying a provider callback into additional social grants', async () => {
    const flow = await complete();
    // Expiring the exchange code must not discard the OAuth callback nonce.
    await nativeSocialGrantsCollection().updateOne(
      { codeHash: hashToken(flow.url.searchParams.get('code')!) },
      { $set: { expiresAt: new Date(Date.now() - 1) } }
    );
    const indexes = await nativeSocialGrantsCollection().indexes();
    expect(
      indexes.some((index) => index.key.cleanupAt === 1 && index.expireAfterSeconds === 0)
    ).toBe(true);
    expect(
      indexes.some((index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)
    ).toBe(false);
    const replay = await request(app)
      .get('/api/v1/auth/google/callback')
      .set('Cookie', flow.cookie)
      .query({ code: 'provider-one-use-code', state: flow.providerState });
    expect(new URL(replay.headers.location as string).searchParams.get('error')).toBe('server');
    expect(await nativeSocialGrantsCollection().countDocuments()).toBe(1);
  });
});

describe('Existing browser OAuth', () => {
  it('still sets a browser refresh cookie and redirects to the main website', async () => {
    const browser = request.agent(app);
    const begin = await browser.get('/api/v1/auth/google');
    const providerState = new URL(begin.headers.location as string).searchParams.get('state')!;
    const callback = await browser
      .get('/api/v1/auth/google/callback')
      .query({ state: providerState, code: 'provider-code' });
    expect(callback.headers.location).toBe(env.OAUTH_SUCCESS_REDIRECT);
    const cookies = callback.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((cookie) => cookie.startsWith(`${env.REFRESH_COOKIE_NAME}=`))).toBe(true);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
    expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
  });

  it('keeps browser denial and provider configuration errors on the website', async () => {
    const denied = await request(app)
      .get('/api/v1/auth/google/callback')
      .query({ error: 'access_denied' });
    expect(new URL(denied.headers.location as string).searchParams.get('reason')).toBe('denied');
    mocks.configured = false;
    const unconfigured = await request(app).get('/api/v1/auth/google');
    expect(new URL(unconfigured.headers.location as string).searchParams.get('reason')).toBe(
      'unconfigured'
    );
  });
});
