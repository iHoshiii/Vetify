import { app, oauth, PROFILE, redirect, session, setupAccountDb } from './account-auth-fixtures';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { listAuthIdentities } from '../../../models/auth-identities';
import { nativeSocialGrantsCollection } from '../../../models/native-social-grant';
import { usersCollection } from '../../../models/users';
import { nativeGoogleCallback } from './account-auth-native-fixtures';

setupAccountDb();

describe('matching emails require explicit linking in both apps', () => {
  it.each(['local', 'facebook'] as const)(
    'refuses a browser and native Google email collision with a %s account',
    async (provider) => {
      const owner = await session(provider);
      oauth.profile.mockResolvedValue(PROFILE);
      const original = await usersCollection().findOne({ _id: owner.user._id });
      const browser = request.agent(app);
      const start = await browser.get('/api/v1/auth/google');
      const state = new URL(start.headers.location as string).searchParams.get('state');
      const completed = await browser
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'provider-code' });
      expect(redirect(completed).searchParams.get('reason')).toBe('account-link-required');
      const native = await nativeGoogleCallback();
      expect(native.url.searchParams.get('error')).toBe('account-link-required');
      expect(native.url.searchParams.get('code')).toBeNull();
      expect(await nativeSocialGrantsCollection().countDocuments()).toBe(0);
      expect(await usersCollection().findOne({ _id: owner.user._id })).toEqual(original);
      expect(
        (await listAuthIdentities(owner.user._id)).filter(
          (identity) => identity.provider === 'google'
        )
      ).toEqual([]);
      expect(await usersCollection().countDocuments()).toBe(1);
    }
  );
});
