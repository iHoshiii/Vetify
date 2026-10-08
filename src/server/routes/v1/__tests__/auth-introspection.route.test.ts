import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../../../config/env';
import { updatePreferences, updateUser, usersCollection } from '../../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import { app, browserSession, connectionCode, exchange, introspect } from './native-auth-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('Planner authorization introspection', () => {
  it('reads the current role, status and region without granting paid capabilities', async () => {
    const { user, browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const native = await exchange(code);
    await updateUser(user._id, { role: 'professional' });
    await updatePreferences(user._id, { region: { timeZone: 'Asia/Tokyo' } });
    const response = await introspect(native.body.accessToken);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.user).toEqual({
      id: user._id.toHexString(),
      role: 'professional',
      status: 'active',
    });
    expect(response.body.region.timeZone).toBe('Asia/Tokyo');
    expect(response.body.subscription).toEqual({ plan: 'free', status: null, expiresAt: null });
    expect(response.body.entitlements).toEqual([]);
    expect(Date.parse(response.body.validUntil)).toBeLessThanOrEqual(
      Date.parse(response.body.tokenExpiresAt)
    );
  });

  it('returns the stored account status even when an older JWT says otherwise', async () => {
    const { user, accessToken } = await browserSession();
    await updateUser(user._id, { status: 'suspended' });
    const response = await introspect(accessToken);
    expect(response.status).toBe(200);
    expect(response.body.user.status).toBe('suspended');
  });

  it.each(['missing', 'invalid'])(
    'uses the existing region default for %s legacy preferences',
    async (kind) => {
      const { user, accessToken } = await browserSession();
      await usersCollection().updateOne(
        { _id: user._id },
        kind === 'missing'
          ? { $unset: { preferences: '' } }
          : { $set: { 'preferences.region.timeZone': 'Invalid/Timezone' } }
      );
      const response = await introspect(accessToken);
      expect(response.status).toBe(200);
      expect(response.body.region.timeZone).toBe('Asia/Manila');
    }
  );

  it('rejects missing, forged, expired and malformed subject tokens', async () => {
    expect((await request(app).post('/api/v1/auth/introspect')).status).toBe(401);
    expect((await introspect('forged')).status).toBe(401);
    for (const claims of [
      { sub: 'invalid', exp: Math.floor(Date.now() / 1000) + 60 },
      { sub: '0123456789abcdef01234567', exp: Math.floor(Date.now() / 1000) - 1 },
    ]) {
      expect((await introspect(jwt.sign(claims, env.JWT_SECRET_ACCESS))).status).toBe(401);
    }
  });

  it('rejects a deleted account behind a valid token', async () => {
    const { user, accessToken } = await browserSession();
    await usersCollection().deleteOne({ _id: user._id });
    expect((await introspect(accessToken)).status).toBe(401);
  });
});
