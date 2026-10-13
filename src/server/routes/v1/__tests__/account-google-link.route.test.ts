import {
  app,
  BASE,
  begin,
  callback,
  methods,
  oauth,
  PASSWORD,
  post,
  PROFILE,
  redirect,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { env } from '../../../config/env';
import { listAuthIdentities } from '../../../models/auth-identities';
import { hashToken, refreshTokensCollection } from '../../../models/refresh-token';
import { comparePassword, usersCollection } from '../../../models/users';
import { nativeGoogleLogin } from './account-auth-native-fixtures';

setupAccountDb();

describe('explicit Google connection', () => {
  it("requires both an authenticated actor and that actor's active browser session", async () => {
    expect((await request(app).get(BASE)).status).toBe(401);
    for (const path of ['google', 'reauthenticate', 'password'])
      expect((await request(app).post(`${BASE}/${path}`).send({})).status).toBe(401);
    const owner = await session();
    expect(
      (await request(app).get(BASE).set('Authorization', `Bearer ${owner.token}`)).status
    ).toBe(401);
    await refreshTokensCollection().updateOne(
      { tokenHash: hashToken(owner.rawRefresh) },
      { $set: { revokedAt: new Date() } }
    );
    expect((await methods(owner)).status).toBe(401);
    expect((await post(owner, 'google', { currentPassword: PASSWORD })).status).toBe(401);
  });

  it('reports actual password availability without exposing credentials', async () => {
    const owner = await session();
    const response = await methods(owner);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      hasPassword: true,
      providers: [],
      googleAvailable: true,
      availableProviders: ['google', 'facebook'],
      passwordReady: false,
      reauthProvider: null,
    });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('refuses the wrong current password before starting provider authorization', async () => {
    const owner = await session();
    const response = await post(owner, 'google', { currentPassword: 'Wrong!' });
    expect(response.status).toBe(400);
    expect(response.body.reason).toBe('password-incorrect');
    expect(response.body.url).toBeUndefined();
    expect(oauth.profile).not.toHaveBeenCalled();
    expect(await listAuthIdentities(owner.user._id)).toEqual([]);
  });

  it('links only the authorized identity and preserves the original provider and password', async () => {
    const owner = await session();
    const original = await usersCollection().findOne({ _id: owner.user._id });
    const flow = await begin(owner);
    expect(flow.url.origin).toBe('https://provider.example');
    expect(flow.sealed.accountAuth).toEqual({
      purpose: 'connect-provider',
      userId: owner.user._id.toHexString(),
      sourceTokenHash: hashToken(owner.rawRefresh),
    });
    const result = await callback(flow);
    expect(redirect(result).origin).toBe(new URL(env.CLIENT_ORIGIN).origin);
    expect(redirect(result).searchParams.get('connection')).toBe('google-linked');
    const stored = await usersCollection().findOne({ _id: owner.user._id });
    expect(stored).toMatchObject({
      provider: 'local',
      providerId: null,
      password: original!.password,
    });
    expect(await comparePassword(stored!.password, PASSWORD)).toBe(true);
    expect(await listAuthIdentities(owner.user._id)).toMatchObject([
      { provider: 'google', providerId: PROFILE.providerId },
    ]);
    expect((await methods(owner)).body).toMatchObject({ hasPassword: true, providers: ['google'] });
    expect((await post(owner, 'google', { currentPassword: PASSWORD })).status).toBe(409);
  });

  it('uses one account for browser and native Google and password logins after connecting', async () => {
    const owner = await session();
    await callback(await begin(owner));
    const browser = request.agent(app);
    const start = await browser.get('/api/v1/auth/google');
    const state = new URL(start.headers.location as string).searchParams.get('state');
    await browser.get('/api/v1/auth/google/callback').query({ state, code: 'provider-code' });
    expect((await browser.post('/api/v1/auth/refresh')).body.user.id).toBe(
      owner.user._id.toHexString()
    );
    const native = await nativeGoogleLogin();
    expect(native.status).toBe(200);
    expect(native.body.user.id).toBe(owner.user._id.toHexString());
    const password = await request(app)
      .post('/api/v1/auth/native/login')
      .send({ email: owner.user.email, password: PASSWORD });
    expect(password.status).toBe(200);
    expect(password.body.user.id).toBe(owner.user._id.toHexString());
    expect(await usersCollection().countDocuments()).toBe(1);
  });
});
