import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { User } from '../../models/User';
import { findOrCreateOAuthUser } from '../auth.service';
import type { OAuthProfile } from '../oauth.service';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

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

describe('findOrCreateOAuthUser', () => {
  it('creates an account with no password from a verified profile', async () => {
    const user = await findOrCreateOAuthUser('google', profile());

    expect(user.email).toBe('ada@example.com');
    expect(user.provider).toBe('google');
    expect(user.providerId).toBe('google-sub-1');
    expect(user.emailVerified).toBe(true);

    const stored = await User.findById(user._id).select('+password');
    expect(stored!.password).toBeFalsy();
  });

  it('never matches a password login against an OAuth account', async () => {
    const user = await findOrCreateOAuthUser('google', profile());
    const stored = (await User.findById(user._id).select('+password'))!;

    await expect(stored.comparePassword('')).resolves.toBe(false);
    await expect(stored.comparePassword('anything')).resolves.toBe(false);
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
    expect(await User.countDocuments()).toBe(1);
  });

  it('matches on providerId even after the provider email changes', async () => {
    const first = await findOrCreateOAuthUser('google', profile());
    const second = await findOrCreateOAuthUser('google', profile({ email: 'new@example.com' }));

    expect(second._id.toString()).toBe(first._id.toString());
    expect(await User.countDocuments()).toBe(1);
  });

  it('links to an existing local account when the provider verified the email', async () => {
    const local = await User.create({
      email: 'ada@example.com',
      password: 'sup3rsecret',
      name: 'Ada',
      provider: 'local',
    });

    const linked = await findOrCreateOAuthUser('google', profile());

    expect(linked._id.toString()).toBe(local._id.toString());
    expect(linked.provider).toBe('google');
    expect(linked.providerId).toBe('google-sub-1');
    expect(linked.emailVerified).toBe(true);
    expect(await User.countDocuments()).toBe(1);
  });

  it('refuses to link an unverified email onto an existing account', async () => {
    await User.create({
      email: 'ada@example.com',
      password: 'sup3rsecret',
      provider: 'local',
    });

    // Otherwise anyone who can register provider-side as someone else's address
    // inherits that account.
    await expect(
      findOrCreateOAuthUser('google', profile({ emailVerified: false }))
    ).rejects.toThrow(/did not verify/i);

    const untouched = (await User.findOne({ email: 'ada@example.com' }))!;
    expect(untouched.provider).toBe('local');
    expect(untouched.providerId).toBeNull();
  });

  it('refuses a profile with no email at all, as TikTok always returns', async () => {
    await expect(
      findOrCreateOAuthUser('tiktok', profile({ email: null, emailVerified: false }))
    ).rejects.toThrow(/does not release an email/i);

    expect(await User.countDocuments()).toBe(0);
  });

  it('keeps two different providers on the same address from silently colliding', async () => {
    await findOrCreateOAuthUser('google', profile());
    const linked = await findOrCreateOAuthUser(
      'facebook',
      profile({ providerId: 'fb-1', name: 'Ada' })
    );

    // Same person, same verified address: one account, now owned by the newer
    // provider rather than duplicated.
    expect(await User.countDocuments()).toBe(1);
    expect(linked.provider).toBe('facebook');
    expect(linked.providerId).toBe('fb-1');
  });
});
