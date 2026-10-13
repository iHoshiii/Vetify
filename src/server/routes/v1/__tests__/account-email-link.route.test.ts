import { describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  addPassword,
  app,
  methods,
  NEW_PASSWORD,
  oauth,
  post,
  PROFILE,
  redirect,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import { emailLinkProof, finishEmailLink, requestLinkCode } from './account-link-code-fixtures';
import { listAuthIdentities } from '../../../models/auth-identities';
import { comparePassword, usersCollection } from '../../../models/users';
import { refreshTokensCollection } from '../../../models/refresh-token';
import { nativeGoogleLogin } from './account-auth-native-fixtures';

setupAccountDb();
describe('email-verified login method linking', () => {
  it.each(['google', 'facebook', 'tiktok'] as const)(
    'links %s to the existing account only after email and provider confirmation',
    async (provider) => {
      const owner = await session(provider === 'google' ? 'local' : 'google');
      await usersCollection().updateOne(
        { _id: owner.user._id },
        { $set: { role: 'professional' } }
      );
      const before = await usersCollection().findOne({ _id: owner.user._id });
      const verified = await emailLinkProof(owner, provider);
      expect(
        (await listAuthIdentities(owner.user._id)).some(
          (identity) => identity.provider === provider
        )
      ).toBe(false);
      oauth.profile.mockResolvedValue({
        ...PROFILE,
        providerId: `${provider}-linked`,
        name: 'Different Social Name',
        ...(provider === 'tiktok' ? { email: null, emailVerified: false } : {}),
      });
      const completed = await finishEmailLink(owner, verified);
      expect(redirect(completed).searchParams.get('connection')).toBe(`${provider}-linked`);
      expect((await methods(owner)).body.providers).toContain(provider);
      const after = await usersCollection().findOne({ _id: owner.user._id });
      expect(after).toEqual(before);
      expect(await usersCollection().countDocuments()).toBe(1);
      const loginStart = await owner.browser.get(`/api/v1/auth/${provider}`);
      const state = new URL(loginStart.headers.location).searchParams.get('state');
      await owner.browser
        .get(`/api/v1/auth/${provider}/callback`)
        .query({ state, code: 'provider-code' });
      const login = await owner.browser.post('/api/v1/auth/refresh');
      expect(login.body.user).toMatchObject({
        id: owner.user._id.toHexString(),
        role: 'professional',
        name: owner.user.name,
      });
      const native = await nativeGoogleLogin(provider);
      expect(native.status).toBe(200);
      expect(native.body.user.id).toBe(owner.user._id.toHexString());
    }
  );

  it('links Public Login using email verification without requiring another Google login', async () => {
    const owner = await session('google');
    await emailLinkProof(owner, 'local');
    expect((await methods(owner)).body.passwordReady).toBe(true);
    const linked = await addPassword(owner);
    expect(linked.status).toBe(200);
    const stored = await usersCollection().findOne({ _id: owner.user._id });
    expect(stored).toMatchObject({
      provider: 'google',
      providerId: 'google-owner',
      emailVerified: true,
    });
    expect(await comparePassword(stored!.password, NEW_PASSWORD)).toBe(true);
    expect(
      await refreshTokensCollection().countDocuments({ user: owner.user._id, revokedAt: null })
    ).toBe(0);
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: owner.user.email, password: NEW_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(owner.user._id.toHexString());
  });

  it('blocks old provider-start endpoints until the email code is verified', async () => {
    const owner = await session();
    for (const provider of ['google', 'facebook', 'tiktok']) {
      const response = await post(owner, provider);
      expect(response.status).toBe(403);
      expect(response.body.reason).toBe('email-link-required');
    }
    expect(await listAuthIdentities(owner.user._id)).toEqual([]);
  });

  it('does not send a code for a method that is already linked', async () => {
    const owner = await session('google');
    expect((await requestLinkCode(owner, 'google')).status).toBe(409);
  });
});
