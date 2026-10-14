import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { getDb } from '../../config/db';
import { env } from '../../config/env';
import {
  comparePassword,
  findUserWithPasswordByEmail,
  insertUser,
  usersCollection,
} from '../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { plannerDevelopmentAccount, seedPlannerAccount } from '../seed-planner-account';

const app = createApp();
const originalMode = env.NODE_ENV;
beforeAll(startTestDb, 120_000);
afterEach(async () => {
  env.NODE_ENV = originalMode;
  await clearTestDb();
});
afterAll(stopTestDb);

describe('Shared dummy consumer account', () => {
  it('creates one consumer account that signs into browser and native authentication', async () => {
    const seeded = await seedPlannerAccount();
    const stored = await findUserWithPasswordByEmail(plannerDevelopmentAccount.email);
    expect(seeded.created).toBe(true);
    expect(stored).toMatchObject({
      name: 'Uma User',
      provider: 'local',
      role: 'user',
      status: 'active',
      emailVerified: true,
    });
    expect(stored?.password).not.toBe(plannerDevelopmentAccount.password);
    expect(await comparePassword(stored!.password, plannerDevelopmentAccount.password)).toBe(true);
    for (const route of ['/api/v1/auth/login', '/api/v1/auth/native/login']) {
      const response = await request(app).post(route).send(plannerDevelopmentAccount);
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe(seeded.userId);
      expect(response.body.user.role).toBe('user');
    }
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it('reuses an account without changing its password, preferences, or subscription', async () => {
    const seeded = await seedPlannerAccount();
    const before = await findUserWithPasswordByEmail(plannerDevelopmentAccount.email);
    await getDb()
      .collection('subscriptions')
      .insertOne({
        user: before!._id,
        plan: 'pro',
        status: 'active',
        expiresAt: new Date('2099-01-01'),
      });
    const subscription = await getDb().collection('subscriptions').findOne({ user: before!._id });
    expect(await seedPlannerAccount()).toEqual({ created: false, userId: seeded.userId });
    expect(await findUserWithPasswordByEmail(plannerDevelopmentAccount.email)).toEqual(before);
    expect(await getDb().collection('subscriptions').findOne({ user: before!._id })).toEqual(
      subscription
    );
  });

  it.each([
    { name: 'administrator', override: { role: 'admin' as const } },
    { name: 'professional', override: { role: 'professional' as const } },
    { name: 'banned', override: { status: 'banned' as const } },
    { name: 'different credentials', override: { password: 'A-different-Password1!' } },
    {
      name: 'social provider',
      override: { provider: 'google' as const, password: null, providerId: 'dummy-provider' },
    },
  ])('leaves a conflicting existing account unchanged: $name', async ({ override }) => {
    await insertUser({ ...plannerDevelopmentAccount, provider: 'local', ...override });
    const before = await findUserWithPasswordByEmail(plannerDevelopmentAccount.email);
    await expect(seedPlannerAccount()).rejects.toThrow('It was left unchanged.');
    expect(await findUserWithPasswordByEmail(plannerDevelopmentAccount.email)).toEqual(before);
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it('handles simultaneous seed runs without creating duplicate accounts', async () => {
    const seeded = await Promise.all([seedPlannerAccount(), seedPlannerAccount()]);
    expect(seeded.filter((result) => result.created)).toHaveLength(1);
    expect(seeded[0].userId).toBe(seeded[1].userId);
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it('does not alter unrelated administrator or professional accounts', async () => {
    for (const role of ['admin', 'professional'] as const) {
      await insertUser({
        email: `${role}@example.test`,
        password: 'UnchangedPassword1!',
        provider: 'local',
        role,
      });
    }
    const before = await usersCollection()
      .find({ email: { $ne: plannerDevelopmentAccount.email } })
      .toArray();
    await seedPlannerAccount();
    expect(
      await usersCollection()
        .find({ email: { $ne: plannerDevelopmentAccount.email } })
        .toArray()
    ).toEqual(before);
  });

  it('refuses production before creating or modifying an account', async () => {
    env.NODE_ENV = 'production';
    await expect(seedPlannerAccount()).rejects.toThrow('cannot run in production');
    expect(await usersCollection().countDocuments()).toBe(0);
  });
});
