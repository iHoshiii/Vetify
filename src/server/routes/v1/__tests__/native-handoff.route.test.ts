import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { nativeHandoffsCollection } from '../../../models/native-handoff';
import { updateUser } from '../../../models/users';
import { hashToken } from '../../../models/refresh-token';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import {
  app,
  browserSession,
  CLIENT,
  connectionCode,
  exchange,
  expireCode,
} from './native-auth-fixtures';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('Main system account handoff', () => {
  it('requires a logged in browser and rejects unregistered clients or callbacks', async () => {
    expect((await request(app).post('/api/v1/auth/native/handoff').send(CLIENT)).status).toBe(401);
    const { browser } = await browserSession();
    for (const payload of [
      { ...CLIENT, clientId: 'other' },
      { ...CLIENT, redirectUri: 'https://evil.test' },
    ]) {
      expect((await browser.post('/api/v1/auth/native/handoff').send(payload)).status).toBe(400);
    }
    expect(await nativeHandoffsCollection().countDocuments()).toBe(0);
  });

  it('creates a private one-minute QR backed by a hash and exchanges it without phone login', async () => {
    const { browser, user, rawRefresh } = await browserSession();
    const { handoff, code } = await connectionCode(browser);
    const stored = await nativeHandoffsCollection().findOne({ codeHash: hashToken(code) });
    expect(handoff.status).toBe(200);
    expect(handoff.body.user.id).toBe(user._id.toHexString());
    expect(handoff.headers['cache-control']).toBe('no-store');
    expect(new URL(handoff.body.url).pathname).toBe('/callback');
    expect(Date.parse(handoff.body.expiresAt) - Date.now()).toBeGreaterThan(50_000);
    expect(Date.parse(handoff.body.expiresAt) - Date.now()).toBeLessThanOrEqual(60_000);
    expect(stored?.sourceTokenHash).toBe(hashToken(rawRefresh));
    expect(JSON.stringify(stored)).not.toContain(code);
    const native = await exchange(code);
    expect(native.status).toBe(200);
    expect(native.body.user.id).toBe(user._id.toHexString());
    expect(native.body.refreshToken).not.toBe(rawRefresh);
    expect(native.headers['set-cookie']).toBeUndefined();
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
  });

  it('consumes a code once even when two phones exchange at the same time', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    const results = await Promise.all([exchange(code), exchange(code)]);
    expect(results.map((entry) => entry.status).sort()).toEqual([200, 401]);
    expect((await exchange(code)).status).toBe(401);
  });

  it('rejects expired codes and replaces old QR codes when a new one is generated', async () => {
    const { browser } = await browserSession();
    const old = await connectionCode(browser);
    const current = await connectionCode(browser);
    expect((await exchange(old.code)).status).toBe(401);
    await expireCode(current.code);
    expect((await exchange(current.code)).status).toBe(401);
  });

  it('rechecks browser logout before exchange', async () => {
    const { browser } = await browserSession();
    const { code } = await connectionCode(browser);
    await browser.post('/api/v1/auth/logout');
    expect((await exchange(code)).status).toBe(401);
  });

  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'rejects a newly %s account',
    async (status) => {
      const { browser, user } = await browserSession();
      const { code } = await connectionCode(browser);
      await updateUser(user._id, { status });
      expect((await exchange(code)).status).toBe(403);
      expect((await browser.post('/api/v1/auth/native/handoff').send(CLIENT)).status).toBe(403);
    }
  );

  it('rejects browser requests from a different origin', async () => {
    const { browser } = await browserSession();
    const response = await browser
      .post('/api/v1/auth/native/handoff')
      .set('Origin', 'https://evil.test')
      .send(CLIENT);
    expect(response.status).toBe(403);
  });

  it('rejects a bearer identity that differs from the cookie account', async () => {
    const { browser } = await browserSession();
    const other = await request(app).post('/api/v1/auth/signup').send({
      name: 'Other User',
      email: 'other@example.com',
      password: 'Sup3rSecret!',
      confirmPassword: 'Sup3rSecret!',
    });
    const response = await browser
      .post('/api/v1/auth/native/handoff')
      .set('Authorization', `Bearer ${other.body.accessToken}`)
      .send(CLIENT);
    expect(response.status).toBe(401);
  });
});
