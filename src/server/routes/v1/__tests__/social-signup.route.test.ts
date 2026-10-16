import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../../../config/env';
import { insertAuthIdentity } from '../../../models/auth-identities';
import { refreshTokensCollection } from '../../../models/refresh-token';
import { insertUser, usersCollection } from '../../../models/users';
import { OAUTH_STATE_COOKIE, unsealState } from '../../../services/oauth-state';
import { app, cookieOf, oauth, PROFILE, redirect, setupAccountDb } from './account-auth-fixtures';

setupAccountDb();

async function begin(provider = 'google', intent = 'signup') {
  const browser = request.agent(app);
  const start = await browser.get(`/api/v1/auth/${provider}`).query({ intent });
  const state = redirect(start).searchParams.get('state');
  const cookie = cookieOf(start, OAUTH_STATE_COOKIE).slice(OAUTH_STATE_COOKIE.length + 1);
  expect(unsealState(cookie)?.intent).toBe(intent);
  return (query: object = {}) =>
    browser.get(`/api/v1/auth/${provider}/callback`).query({ code: 'test-code', state, ...query });
}

describe('explicit social signup', () => {
  it.each(['google', 'facebook', 'tiktok'] as const)(
    'asks an existing %s account to log in without issuing a session or changing the profile',
    async (provider) => {
      const existing = await insertUser({
        email: PROFILE.email!,
        provider,
        providerId: PROFILE.providerId,
        name: 'Original professional',
        role: 'professional',
        emailVerified: true,
      });
      const before = await usersCollection().findOne({ _id: existing._id });
      const callback = await begin(provider);
      const response = await callback({ intent: 'login' });
      expect(redirect(response).pathname).toBe('/signup');
      expect(redirect(response).searchParams.get('reason')).toBe(`account-exists-${provider}`);
      expect(redirect(response).searchParams.get('error')).toBe('oauth');
      expect(cookieOf(response, env.REFRESH_COOKIE_NAME)).toBe('');
      expect(await refreshTokensCollection().countDocuments()).toBe(0);
      expect(await usersCollection().countDocuments()).toBe(1);
      expect(await usersCollection().findOne({ _id: existing._id })).toEqual(before);
    }
  );

  it('rejects signup through Google already linked to an email/password account', async () => {
    const user = await insertUser({
      email: PROFILE.email!,
      provider: 'local',
      password: 'Secret72!',
    });
    await insertAuthIdentity({
      user: user._id,
      provider: 'google',
      providerId: PROFILE.providerId,
    });
    const callback = await begin();
    expect(redirect(await callback()).searchParams.get('reason')).toBe('account-exists-google');
    expect(await usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
  });

  it('rejects a normalized email match without linking or overwriting that account', async () => {
    const user = await insertUser({
      email: PROFILE.email!,
      provider: 'local',
      name: 'Original',
      password: 'Secret72!',
    });
    oauth.profile.mockResolvedValue({ ...PROFILE, email: '  OWNER@EXAMPLE.COM  ' });
    const callback = await begin();
    expect(redirect(await callback()).searchParams.get('reason')).toBe('account-exists');
    expect(await usersCollection().findOne({ _id: user._id })).toMatchObject({
      name: 'Original',
      provider: 'local',
      providerId: null,
    });
    expect(await usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
  });

  it('creates a new Google account once, rejects another signup and permits normal login', async () => {
    const signup = await begin();
    expect(redirect(await signup()).toString()).toBe(env.OAUTH_SUCCESS_REDIRECT);
    expect(await usersCollection().countDocuments()).toBe(1);
    const duplicate = await begin();
    expect(redirect(await duplicate()).searchParams.get('reason')).toBe('account-exists-google');
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
    const login = await begin('google', 'login');
    const loggedIn = await login({ intent: 'signup' });
    expect(redirect(loggedIn).toString()).toBe(env.OAUTH_SUCCESS_REDIRECT);
    expect(cookieOf(loggedIn, env.REFRESH_COOKIE_NAME)).not.toBe('');
    expect(await usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(2);
  });

  it('returns cancelled signup to signup without creating an account', async () => {
    const callback = await begin();
    const response = await callback({ error: 'access_denied' });
    expect(redirect(response).pathname).toBe('/signup');
    expect(redirect(response).searchParams.get('reason')).toBe('denied');
    expect(await usersCollection().countDocuments()).toBe(0);
  });

  it('rejects simultaneous Google signups without issuing a second session', async () => {
    const first = await begin();
    const second = await begin();
    const results = await Promise.all([first(), second()]);
    const failures = results.filter((result) => redirect(result).pathname === '/signup');
    expect(failures).toHaveLength(1);
    expect(redirect(failures[0]).searchParams.get('reason')).toMatch(/^account-exists/);
    expect(await usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
  });
});
