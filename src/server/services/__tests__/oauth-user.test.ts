import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { comparePassword, findUserByEmail, insertUser, usersCollection } from '../../models/users';
import { insertAuthIdentity, listAuthIdentities } from '../../models/auth-identities';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { findOrCreateOAuthUser } from '../auth.service';
import type { OAuthProfile } from '../oauth.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

function profile(overrides: Partial<OAuthProfile> = {}): OAuthProfile {
  return {
    providerId: 'google-sub-1',
    email: 'ada@example.com',
    name: 'Ada',
    avatarUrl: 'https://cdn.example/a.png',
    emailVerified: true,
    ...overrides,
  };
}

const countUsers = () => usersCollection().countDocuments();

describe('findOrCreateOAuthUser', () => {
  it('creates an account with no password from a verified profile', async () => {
    const user = await findOrCreateOAuthUser('google', profile());

    expect(user.email).toBe('ada@example.com');
    expect(user.provider).toBe('google');
    expect(user.providerId).toBe('google-sub-1');
    expect(user.emailVerified).toBe(true);

    const stored = await usersCollection().findOne({ _id: user._id });
    expect(stored!.password).toBeNull();
  });

  it('never matches a password login against an OAuth account', async () => {
    const user = await findOrCreateOAuthUser('google', profile());
    const stored = (await usersCollection().findOne({ _id: user._id }))!;

    await expect(comparePassword(stored.password, '')).resolves.toBe(false);
    await expect(comparePassword(stored.password, 'anything')).resolves.toBe(false);
  });

  it('returns the same account on a second login and follows profile changes', async () => {
    const first = await findOrCreateOAuthUser('google', profile());
    const second = await findOrCreateOAuthUser(
      'google',
      profile({ name: 'Ada Lovelace', avatarUrl: 'https://cdn.example/b.png' })
    );

    expect(second._id.toString()).toBe(first._id.toString());
    expect(second.name).toBe('Ada Lovelace');
    expect(second.avatarUrl).toBe('https://cdn.example/b.png');
    expect(await countUsers()).toBe(1);
  });

  it('matches on providerId even after the provider email changes', async () => {
    const first = await findOrCreateOAuthUser('google', profile());
    const second = await findOrCreateOAuthUser('google', profile({ email: 'new@example.com' }));

    expect(second._id.toString()).toBe(first._id.toString());
    expect(await countUsers()).toBe(1);
  });

  it('requires explicit linking when a verified profile shares an existing local email', async () => {
    const local = await insertUser({
      email: 'ada@example.com',
      password: 'sup3rsecret',
      name: 'Ada',
      provider: 'local',
    });

    await expect(findOrCreateOAuthUser('google', profile())).rejects.toMatchObject({
      reason: 'account-link-required',
    });
    const untouched = await usersCollection().findOne({ _id: local._id });
    expect(untouched).toMatchObject({ provider: 'local', providerId: null, emailVerified: false });
    expect(await comparePassword(untouched!.password, 'sup3rsecret')).toBe(true);
    expect(await listAuthIdentities(local._id)).toEqual([]);
    expect(await countUsers()).toBe(1);
  });

  it('refuses to link an unverified email onto an existing account', async () => {
    await insertUser({
      email: 'ada@example.com',
      password: 'sup3rsecret',
      provider: 'local',
    });

    await expect(
      findOrCreateOAuthUser('google', profile({ emailVerified: false }))
    ).rejects.toMatchObject({ reason: 'account-link-required' });

    const untouched = (await findUserByEmail('ada@example.com'))!;
    expect(untouched.provider).toBe('local');
    expect(untouched.providerId).toBeNull();
  });

  it('refuses a profile with no email at all, as TikTok always returns', async () => {
    await expect(
      findOrCreateOAuthUser('tiktok', profile({ email: null, emailVerified: false }))
    ).rejects.toThrow(/does not release an email/i);

    expect(await countUsers()).toBe(0);
  });

  it('keeps two different providers on the same address from silently colliding', async () => {
    await findOrCreateOAuthUser('google', profile());
    await expect(
      findOrCreateOAuthUser('facebook', profile({ providerId: 'fb-1', name: 'Ada' }))
    ).rejects.toMatchObject({ reason: 'account-link-required' });

    expect(await countUsers()).toBe(1);
    expect((await findUserByEmail('ada@example.com'))?.provider).toBe('google');
  });

  it('uses an explicitly connected identity without replacing local credentials', async () => {
    const local = await insertUser({
      email: 'ada@example.com',
      password: 'sup3rsecret',
      provider: 'local',
    });
    await insertAuthIdentity({ user: local._id, provider: 'google', providerId: 'google-sub-1' });
    const signedIn = await findOrCreateOAuthUser(
      'google',
      profile({ email: 'changed@example.com' })
    );
    expect(signedIn._id.toHexString()).toBe(local._id.toHexString());
    expect(signedIn.provider).toBe('local');
    expect(signedIn.email).toBe('ada@example.com');
    expect(
      await comparePassword(
        (await usersCollection().findOne({ _id: local._id }))!.password,
        'sup3rsecret'
      )
    ).toBe(true);
    expect(await countUsers()).toBe(1);
  });

  it('preserves a legacy provider identity when its email changes or is unavailable', async () => {
    const legacy = await insertUser({
      email: 'ada@example.com',
      provider: 'google',
      providerId: 'google-sub-1',
    });
    const signedIn = await findOrCreateOAuthUser(
      'google',
      profile({ email: null, emailVerified: false })
    );
    expect(signedIn._id.toHexString()).toBe(legacy._id.toHexString());
    const renamed = await findOrCreateOAuthUser('google', profile({ email: 'new@example.com' }));
    expect(renamed._id.toHexString()).toBe(legacy._id.toHexString());
    expect(renamed.email).toBe('ada@example.com');
    expect(await countUsers()).toBe(1);
  });
});
