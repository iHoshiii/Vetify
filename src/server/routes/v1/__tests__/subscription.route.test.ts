import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { auditLogsCollection } from '../../../models/audit-log';
import {
  findSubscription,
  setSubscription,
  subscriptionsCollection,
} from '../../../models/subscriptions';
import { insertUser, updateUser, usersCollection, type UserRole } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { app, browserSession, CREDENTIALS, introspect, nativeLogout } from './native-auth-fixtures';

const FREE = { plan: 'free', status: null, expiresAt: null };
const SIGNUP = { ...CREDENTIALS, name: 'Mobile Owner', confirmPassword: CREDENTIALS.password };
let sequence = 0;

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const ownSubscription = (token: string) =>
  request(app).get('/api/v1/auth/subscription').set('Authorization', `Bearer ${token}`);
const adminPath = (id: ObjectId) => `/api/v1/admin/users/${id.toHexString()}/subscription`;
const adminRead = (id: ObjectId, token: string) =>
  request(app).get(adminPath(id)).set('Authorization', `Bearer ${token}`);
const adminWrite = (id: ObjectId, token: string, body: object) =>
  request(app).put(adminPath(id)).set('Authorization', `Bearer ${token}`).send(body);
const pro = (expiresAt = new Date(Date.now() + 60_000)) => ({
  plan: 'pro' as const,
  status: 'active' as const,
  expiresAt,
});

async function account(role: UserRole = 'user') {
  sequence += 1;
  const user = await insertUser({
    email: `subscription-${sequence}@example.com`,
    name: 'Subscription Owner',
    provider: 'google',
    providerId: `subscription-${sequence}`,
    role,
  });
  const token = signAccessToken({ sub: user._id.toHexString(), email: user.email, role });
  return { user, token };
}

async function sharedSessions() {
  const web = await browserSession();
  const native = await request(app).post('/api/v1/auth/native/login').send(CREDENTIALS);
  expect(native.status).toBe(200);
  expect(native.body.user.id).toBe(web.user._id.toHexString());
  return { ...web, native, tokens: [web.accessToken, native.body.accessToken as string] };
}

describe('Shared account subscriptions', () => {
  it('returns the same default Free plan to website and mobile sessions', async () => {
    const { tokens } = await sharedSessions();
    for (const token of tokens) {
      const response = await ownSubscription(token);
      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.body).toEqual({ subscription: FREE });
      expect((await introspect(token)).body.subscription).toEqual(FREE);
    }
  });

  it('shares one Pro subscription and limits planner authorization to its expiry', async () => {
    const { user, tokens } = await sharedSessions();
    const active = pro(new Date(Date.now() + 15_000));
    await setSubscription(user._id, active);
    const expected = { ...active, expiresAt: active.expiresAt.toISOString() };
    for (const token of tokens) {
      expect((await ownSubscription(token)).body).toEqual({ subscription: expected });
      const authorization = await introspect(token);
      expect(authorization.status).toBe(200);
      expect(authorization.body.subscription).toEqual(expected);
      expect(authorization.body.validUntil).toBe(expected.expiresAt);
    }
  });

  it('reflects cancellation, expiry and downgrade in existing sessions without another login', async () => {
    const { user, tokens } = await sharedSessions();
    const active = pro();
    const expired = pro(new Date(Date.now() - 1_000));
    await setSubscription(user._id, active);
    const states = [
      {
        stored: { ...active, status: 'cancelled' as const },
        resolved: { plan: 'free', status: 'cancelled', expiresAt: active.expiresAt.toISOString() },
      },
      {
        stored: expired,
        resolved: { plan: 'free', status: 'expired', expiresAt: expired.expiresAt.toISOString() },
      },
      { stored: { plan: 'free' as const, status: null, expiresAt: null }, resolved: FREE },
    ];
    for (const state of states) {
      await setSubscription(user._id, state.stored);
      for (const token of tokens) {
        expect((await ownSubscription(token)).body.subscription).toEqual(state.resolved);
        expect((await introspect(token)).body.subscription).toEqual(state.resolved);
      }
    }
    expect(await subscriptionsCollection().countDocuments({ user: user._id })).toBe(1);
  });

  it('keeps one record for a canonical user even with simultaneous subscription updates', async () => {
    const { user } = await account();
    await Promise.all([
      setSubscription(user._id, pro()),
      setSubscription(new ObjectId(user._id.toHexString()), pro()),
    ]);
    expect(await subscriptionsCollection().countDocuments({ user: user._id })).toBe(1);
    expect((await findSubscription(user._id))?.user).toEqual(user._id);
  });

  it('ignores public signup attempts to grant a paid plan on either interface', async () => {
    for (const [index, route] of ['/api/v1/auth/signup', '/api/v1/auth/native/signup'].entries()) {
      const response = await request(app)
        .post(route)
        .send({
          ...SIGNUP,
          email: `paid-signup-${index}@example.com`,
          plan: 'pro',
          subscription: { ...pro(), expiresAt: pro().expiresAt.toISOString() },
        });
      expect(response.status).toBe(200);
      expect((await ownSubscription(response.body.accessToken)).body.subscription).toEqual(FREE);
      expect((await introspect(response.body.accessToken)).body.subscription).toEqual(FREE);
    }
    expect(await subscriptionsCollection().countDocuments({ plan: 'pro' })).toBe(0);
  });

  it('refuses anonymous, invalid, blocked, deleted and revoked mobile sessions', async () => {
    expect((await request(app).get('/api/v1/auth/subscription')).status).toBe(401);
    expect((await ownSubscription('forged')).status).toBe(401);
    const { user, accessToken, native } = await sharedSessions();
    await updateUser(user._id, { status: 'banned' });
    expect((await ownSubscription(accessToken)).status).toBe(403);
    expect((await ownSubscription(native.body.accessToken)).status).toBe(403);
    await updateUser(user._id, { status: 'active' });
    expect((await nativeLogout(native.body.refreshToken)).status).toBe(200);
    expect((await ownSubscription(native.body.accessToken)).status).toBe(401);
    await usersCollection().deleteOne({ _id: user._id });
    expect((await ownSubscription(accessToken)).status).toBe(401);
  });
});

describe('Administrative subscription updates', () => {
  it('grants a shared Pro plan, records its audit trail, and downgrades both sessions', async () => {
    const { user: admin, token } = await account('admin');
    const { user: target, tokens } = await sharedSessions();
    const active = pro();
    const expected = { ...active, expiresAt: active.expiresAt.toISOString() };
    const updated = await adminWrite(target._id, token, {
      ...expected,
      reason: 'Existing Pro member',
    });
    expect(updated.status).toBe(200);
    expect(updated.headers['cache-control']).toBe('no-store');
    expect(updated.body).toEqual({ subscription: expected });
    const read = await adminRead(target._id, token);
    expect(read.status).toBe(200);
    expect(read.headers['cache-control']).toBe('no-store');
    expect(read.body).toEqual(updated.body);
    for (const session of tokens) {
      expect((await ownSubscription(session)).body.subscription).toEqual(expected);
    }
    const audit = await auditLogsCollection().findOne({ action: 'user.subscription.updated' });
    expect(audit).toMatchObject({
      actor: admin._id,
      actorEmail: admin.email,
      targetType: 'user',
      targetId: target._id,
      reason: 'Existing Pro member',
      metadata: { from: FREE, to: expected },
    });
    expect((await adminWrite(target._id, token, FREE)).body).toEqual({ subscription: FREE });
    for (const session of tokens) {
      expect((await introspect(session)).body.subscription).toEqual(FREE);
    }
    expect(
      await auditLogsCollection().countDocuments({ action: 'user.subscription.updated' })
    ).toBe(2);
  });

  it('requires the current stored admin role, including for old and misleading role claims', async () => {
    const { user: target, token: userToken } = await account();
    const forgedRole = signAccessToken({
      sub: target._id.toHexString(),
      email: target.email,
      role: 'admin',
    });
    const { user: formerAdmin, token: staleAdminToken } = await account('admin');
    await updateUser(formerAdmin._id, { role: 'user' });
    expect((await request(app).get(adminPath(target._id))).status).toBe(401);
    expect((await request(app).put(adminPath(target._id)).send(FREE)).status).toBe(401);
    for (const token of [userToken, forgedRole, staleAdminToken]) {
      expect((await adminRead(target._id, token)).status).toBe(403);
      expect((await adminWrite(target._id, token, FREE)).status).toBe(403);
    }
    expect(await subscriptionsCollection().countDocuments()).toBe(0);
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });

  it('rejects inconsistent plans, past active expiry, unknown fields and nonexistent users', async () => {
    const { token } = await account('admin');
    const { user: target } = await account();
    const active = pro();
    const valid = { ...active, expiresAt: active.expiresAt.toISOString() };
    const invalid = [
      { ...valid, plan: 'enterprise' },
      { ...valid, status: null },
      { ...valid, expiresAt: null },
      { ...valid, expiresAt: 'tomorrow' },
      { ...valid, expiresAt: new Date(Date.now() - 1_000).toISOString() },
      { ...valid, expiresAt: 1234 },
      { ...valid, unknown: true },
      { ...FREE, status: 'active' },
      { ...FREE, expiresAt: valid.expiresAt },
    ];
    for (const body of invalid) {
      expect((await adminWrite(target._id, token, body)).status).toBe(400);
    }
    expect((await adminRead(new ObjectId(), token)).status).toBe(404);
    expect((await adminWrite(new ObjectId(), token, valid)).status).toBe(404);
    expect(
      (
        await request(app)
          .get('/api/v1/admin/users/invalid/subscription')
          .set('Authorization', `Bearer ${token}`)
      ).status
    ).toBe(404);
    expect(await subscriptionsCollection().countDocuments()).toBe(0);
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });
});
