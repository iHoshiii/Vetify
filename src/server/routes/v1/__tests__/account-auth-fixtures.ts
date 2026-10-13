import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, expect, vi } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { insertUser } from '../../../models/users';
import type { OAuthProfile } from '../../../services/oauth.service';
import { OAUTH_STATE_COOKIE, unsealState } from '../../../services/oauth-state';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const mocks = vi.hoisted(() => ({ configured: true, profile: vi.fn() }));
vi.mock('../../../services/oauth.service', async (original) => ({
  ...(await original<typeof import('../../../services/oauth.service')>()),
  getProviderConfig: () =>
    mocks.configured
      ? {
          clientId: 'account-test-client',
          clientSecret: 'account-test-secret',
          authorizeUrl: 'https://provider.example/authorize',
          tokenUrl: 'https://provider.example/token',
          scope: 'email profile',
          clientIdParam: 'client_id',
          fetchProfile: mocks.profile,
        }
      : null,
  fetchProfileFromCode: mocks.profile,
}));

export const oauth = mocks;
export const app = createApp();
export const PASSWORD = 'Sup3rSecret!';
export const NEW_PASSWORD = 'NewSecure72!';
export const BASE = '/api/v1/account/login-methods';
export const PROFILE: OAuthProfile = {
  providerId: 'google-owner',
  email: 'owner@example.com',
  name: 'Owner',
  avatarUrl: null,
  emailVerified: true,
};
export function cookieOf(response: request.Response, name: string): string {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  return (
    cookies
      ?.filter((value) => value.startsWith(`${name}=`))
      .pop()
      ?.split(';')[0] ?? ''
  );
}
export type BrowserSession = Awaited<ReturnType<typeof session>>;
export async function session(
  provider: 'local' | 'google' | 'facebook' = 'local',
  email = PROFILE.email!
) {
  const providerId = email === PROFILE.email ? `${provider}-owner` : `${provider}-${email}`;
  const user = await insertUser({
    emailVerified: true,
    email,
    name: 'Owner',
    provider,
    providerId: provider === 'local' ? undefined : providerId,
    ...(provider === 'local' ? { password: PASSWORD } : {}),
  });
  const browser = request.agent(app);
  let response: request.Response;
  if (provider === 'local')
    response = await browser.post('/api/v1/auth/login').send({ email, password: PASSWORD });
  else {
    oauth.profile.mockResolvedValue({ ...PROFILE, email, providerId });
    const start = await browser.get(`/api/v1/auth/${provider}`);
    const state = new URL(start.headers.location as string).searchParams.get('state');
    await browser.get(`/api/v1/auth/${provider}/callback`).query({ state, code: 'provider-code' });
    response = await browser.post('/api/v1/auth/refresh');
  }
  expect(response.status).toBe(200);
  const refreshCookie = cookieOf(response, env.REFRESH_COOKIE_NAME);
  return {
    user,
    browser,
    token: response.body.accessToken as string,
    refreshCookie,
    rawRefresh: refreshCookie.slice(env.REFRESH_COOKIE_NAME.length + 1),
  };
}
export const methods = (owner: BrowserSession) =>
  owner.browser.get(BASE).set('Authorization', `Bearer ${owner.token}`);
export const post = (owner: BrowserSession, path: string, body: object = {}) =>
  owner.browser.post(`${BASE}/${path}`).set('Authorization', `Bearer ${owner.token}`).send(body);
export async function begin(
  owner: BrowserSession,
  purpose: 'google' | 'facebook' | 'reauthenticate' = 'google'
) {
  const response = await post(
    owner,
    purpose,
    purpose !== 'reauthenticate' ? { currentPassword: PASSWORD } : {}
  );
  expect(response.status).toBe(200);
  const url = new URL(response.body.url as string);
  const stateCookie = cookieOf(response, OAUTH_STATE_COOKIE);
  const sealed = unsealState(stateCookie.slice(OAUTH_STATE_COOKIE.length + 1))!;
  return { owner, response, url, state: url.searchParams.get('state')!, stateCookie, sealed };
}
export const callback = (flow: Awaited<ReturnType<typeof begin>>, query: object = {}) =>
  flow.owner.browser
    .get(`/api/v1/auth/${flow.sealed.provider}/callback`)
    .query({ state: flow.state, code: 'provider-code', ...query });
export const redirect = (response: request.Response) =>
  new URL(response.headers.location as string);
export const addPassword = (owner: BrowserSession, password = NEW_PASSWORD) =>
  post(owner, 'password', { newPassword: password, confirmPassword: password });
export async function proof(owner: BrowserSession) {
  const flow = await begin(owner, 'reauthenticate');
  const completed = await callback(flow);
  expect(redirect(completed).searchParams.get('auth')).toBe('password-ready');
  return { flow, completed };
}
export function setupAccountDb() {
  beforeAll(startTestDb, 120_000);
  beforeEach(() => {
    oauth.configured = true;
    oauth.profile.mockReset().mockResolvedValue(PROFILE);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Unexpected external HTTP request');
      })
    );
  });
  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    await clearTestDb();
  });
  afterAll(stopTestDb);
}
