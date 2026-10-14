import {
  app,
  begin,
  callback,
  methods,
  oauth,
  PROFILE,
  redirect,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { insertAuthIdentity, listAuthIdentities } from '../../../models/auth-identities';
import { usersCollection } from '../../../models/users';

setupAccountDb();

describe('multiple explicitly connected providers', () => {
  it('keeps Google and Facebook connected to the original password account', async () => {
    const owner = await session();
    const original = await usersCollection().findOne({ _id: owner.user._id });
    await callback(await begin(owner, 'google'));
    oauth.profile.mockResolvedValue({ ...PROFILE, providerId: 'facebook-owner' });
    const completed = await callback(await begin(owner, 'facebook'));
    expect(redirect(completed).searchParams.get('connection')).toBe('facebook-linked');
    expect((await methods(owner)).body.providers).toEqual(
      expect.arrayContaining(['google', 'facebook'])
    );
    expect(await usersCollection().findOne({ _id: owner.user._id })).toMatchObject({
      provider: original!.provider,
      providerId: original!.providerId,
      password: original!.password,
      emailVerified: original!.emailVerified,
    });
    const browser = request.agent(app);
    const start = await browser.get('/api/v1/auth/facebook');
    const state = new URL(start.headers.location as string).searchParams.get('state');
    await browser.get('/api/v1/auth/facebook/callback').query({ state, code: 'code' });
    expect((await browser.post('/api/v1/auth/refresh')).body.user.id).toBe(
      owner.user._id.toHexString()
    );
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it('refuses an identity claimed through the new identity records', async () => {
    const owner = await session();
    const other = await session('local', 'other@example.com');
    await insertAuthIdentity({
      user: other.user._id,
      provider: 'google',
      providerId: PROFILE.providerId,
    });
    const completed = await callback(await begin(owner));
    expect(redirect(completed).searchParams.get('accountAuthError')).toBe('identity-in-use');
    expect(await listAuthIdentities(owner.user._id)).toEqual([]);
    expect(await listAuthIdentities(other.user._id)).toHaveLength(1);
  });

  it('enforces one account per provider even for concurrent linking attempts', async () => {
    const owner = await session();
    const attempts = await Promise.allSettled(
      ['first', 'second'].map((providerId) =>
        insertAuthIdentity({ user: owner.user._id, provider: 'google', providerId })
      )
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(await listAuthIdentities(owner.user._id)).toHaveLength(1);
  });
});
