import {
  addPassword,
  app,
  begin,
  callback,
  methods,
  NEW_PASSWORD,
  oauth,
  post,
  proof,
  PROFILE,
  redirect,
  session,
  setupAccountDb,
} from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { refreshTokensCollection } from '../../../models/refresh-token';
import { nativeSessionsCollection } from '../../../models/native-session';
import { comparePassword, usersCollection } from '../../../models/users';
import { nativeGoogleLogin } from './account-auth-native-fixtures';

setupAccountDb();

describe('adding a password to a social account', () => {
  it('requires provider confirmation before enabling password login', async () => {
    const owner = await session('google');
    expect((await methods(owner)).body).toMatchObject({
      hasPassword: false,
      passwordReady: false,
      reauthProvider: 'google',
    });
    const rejected = await addPassword(owner);
    expect(rejected.status).toBe(403);
    expect(rejected.body.reason).toBe('reauth-required');
    expect((await usersCollection().findOne({ _id: owner.user._id }))?.password).toBeNull();
  });

  it.each(['google', 'facebook'] as const)(
    'adds a password to the same %s account and revokes every device',
    async (provider) => {
      const owner = await session(provider);
      let nativeToken: string | undefined;
      if (provider === 'google') nativeToken = (await nativeGoogleLogin()).body.accessToken;
      await proof(owner);
      expect((await methods(owner)).body.passwordReady).toBe(true);
      const response = await addPassword(owner);
      expect(response.status).toBe(200);
      const stored = await usersCollection().findOne({ _id: owner.user._id });
      expect(stored?.provider).toBe(provider);
      expect(stored?.providerId).toBe(`${provider}-owner`);
      expect(await comparePassword(stored!.password, NEW_PASSWORD)).toBe(true);
      expect(
        await refreshTokensCollection().countDocuments({ user: owner.user._id, revokedAt: null })
      ).toBe(0);
      expect(
        await nativeSessionsCollection().countDocuments({ user: owner.user._id, revokedAt: null })
      ).toBe(0);
      expect((await methods(owner)).status).toBe(401);
      if (nativeToken)
        expect(
          (
            await request(app)
              .get('/api/v1/account/preferences')
              .set('Authorization', `Bearer ${nativeToken}`)
          ).status
        ).toBe(401);
      for (const path of ['/api/v1/auth/login', '/api/v1/auth/native/login']) {
        const login = await request(app)
          .post(path)
          .send({ email: owner.user.email, password: NEW_PASSWORD });
        expect(login.status).toBe(200);
        expect(login.body.user.id).toBe(owner.user._id.toHexString());
      }
      expect(await usersCollection().countDocuments()).toBe(1);
    }
  );

  it('rejects a different provider identity even when its email matches', async () => {
    const owner = await session('google');
    const flow = await begin(owner, 'reauthenticate');
    oauth.profile.mockResolvedValue({ ...PROFILE, providerId: 'someone-else' });
    expect(redirect(await callback(flow)).searchParams.get('accountAuthError')).toBe(
      'identity-mismatch'
    );
    expect((await methods(owner)).body.passwordReady).toBe(true);
  });

  it('rejects unverified provider email during password confirmation', async () => {
    const owner = await session('google');
    const flow = await begin(owner, 'reauthenticate');
    oauth.profile.mockResolvedValue({ ...PROFILE, emailVerified: false });
    expect(redirect(await callback(flow)).searchParams.get('accountAuthError')).toBe(
      'email-mismatch'
    );
    expect((await methods(owner)).body.passwordReady).toBe(true);
  });

  it('validates strength and confirmation without consuming a valid proof', async () => {
    const owner = await session('google');
    await proof(owner);
    for (const body of [
      { newPassword: 'weak', confirmPassword: 'weak' },
      { newPassword: NEW_PASSWORD, confirmPassword: 'OtherPassword73!' },
    ])
      expect((await post(owner, 'password', body)).status).toBe(400);
    expect((await methods(owner)).body.passwordReady).toBe(true);
    expect((await addPassword(owner)).status).toBe(200);
  });

  it('never replaces an existing password through the add endpoint', async () => {
    const owner = await session();
    const before = await usersCollection().findOne({ _id: owner.user._id });
    expect((await post(owner, 'reauthenticate')).status).toBe(409);
    expect((await addPassword(owner)).status).toBe(409);
    expect((await usersCollection().findOne({ _id: owner.user._id }))?.password).toBe(
      before?.password
    );
  });
});
