import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  findUserWithPasswordByEmail,
  insertUser,
  updateUser,
  usersCollection,
} from '../../../models/users';
import { refreshTokensCollection } from '../../../models/refresh-token';
import { auditLogsCollection } from '../../../models/audit-log';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';
import {
  app,
  browserSession,
  CREDENTIALS,
  introspect,
  nativeLogout,
  nativeRefresh,
} from './native-auth-fixtures';

const SIGNUP = { ...CREDENTIALS, name: 'Mobile Owner', confirmPassword: CREDENTIALS.password };
const nativeLogin = (body: object) => request(app).post('/api/v1/auth/native/login').send(body);
const nativeSignup = (body: object) => request(app).post('/api/v1/auth/native/signup').send(body);

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('Email and password mobile authentication', () => {
  it('uses existing website credentials without requiring a browser login on the phone', async () => {
    const { user } = await browserSession();
    const mobile = await nativeLogin({ ...CREDENTIALS, email: '  MOBILE@EXAMPLE.COM  ' });
    expect(mobile.status).toBe(200);
    expect(mobile.body.user.id).toBe(user._id.toHexString());
    expect(mobile.body.user.email).toBe('mobile@example.com');
    expect(mobile.body.user.password).toBeUndefined();
    expect(mobile.headers['set-cookie']).toBeUndefined();
    expect(mobile.headers['cache-control']).toBe('no-store');
    expect(typeof mobile.body.accessToken).toBe('string');
    expect(mobile.body.refreshToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it('creates one normalized shared account that also signs in on the website', async () => {
    const mobile = await nativeSignup({
      ...SIGNUP,
      email: '  MOBILE@EXAMPLE.COM  ',
      name: '  Mobile Owner  ',
      role: 'admin',
      status: 'banned',
      emailVerified: true,
      provider: 'google',
    });
    expect(mobile.status).toBe(200);
    expect(mobile.headers['set-cookie']).toBeUndefined();
    expect(mobile.body.user).toMatchObject({
      email: 'mobile@example.com',
      name: 'Mobile Owner',
      role: 'user',
      provider: 'local',
      emailVerified: false,
    });
    const stored = await findUserWithPasswordByEmail(CREDENTIALS.email);
    expect(stored?.password).not.toBe(CREDENTIALS.password);
    expect(stored?.status).toBe('active');
    const web = await request(app).post('/api/v1/auth/login').send(CREDENTIALS);
    expect(web.status).toBe(200);
    expect(web.body.user.id).toBe(mobile.body.user.id);
    expect(web.headers['set-cookie']).toBeDefined();
    expect((await introspect(mobile.body.accessToken)).body.user.id).toBe(mobile.body.user.id);
    const duplicate = await nativeSignup(SIGNUP);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: 'Account already exist. Please login.',
      reason: 'account-exists',
    });
    expect((await request(app).post('/api/v1/auth/signup').send(SIGNUP)).status).toBe(409);
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it('uses the same account created through website registration', async () => {
    const web = await request(app).post('/api/v1/auth/signup').send(SIGNUP);
    expect(web.status).toBe(200);
    const mobile = await nativeLogin(CREDENTIALS);
    expect(mobile.status).toBe(200);
    expect(mobile.body.user.id).toBe(web.body.user.id);
    const duplicate = await nativeSignup({ ...SIGNUP, email: 'MOBILE@EXAMPLE.COM' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: 'Account already exist. Please login.',
      reason: 'account-exists',
    });
    expect(await usersCollection().countDocuments()).toBe(1);
  });

  it('rejects concurrent duplicate registration with one shared email', async () => {
    const responses = await Promise.all([
      nativeSignup(SIGNUP),
      nativeSignup({ ...SIGNUP, email: 'MOBILE@EXAMPLE.COM' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(responses.find((response) => response.status === 409)?.body).toEqual({
      error: 'Account already exist. Please login.',
      reason: 'account-exists',
    });
    expect(await usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
  });

  it('asks unregistered mobile users to create an account and preserves generic website errors', async () => {
    const credentials = { email: 'missing@example.com', password: 'Wrong!' };
    const mobile = await nativeLogin(credentials);
    expect(mobile.status).toBe(401);
    expect(mobile.body).toEqual({
      error: 'Create an account first to use the app.',
      reason: 'account-not-found',
    });
    const web = await request(app).post('/api/v1/auth/login').send(credentials);
    expect(web.status).toBe(401);
    expect(web.body).toEqual({ error: 'Invalid credentials' });
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
  });

  it('keeps wrong-password and provider-only refusals distinct from unregistered accounts', async () => {
    const local = await insertUser({ ...CREDENTIALS, provider: 'local', name: 'Local' });
    await updateUser(local._id, { status: 'banned' });
    await insertUser({
      email: 'oauth@example.com',
      provider: 'google',
      providerId: 'google-user',
      name: 'OAuth',
    });
    const responses = await Promise.all([
      nativeLogin({ ...CREDENTIALS, password: 'Wrong!' }),
      nativeLogin({ email: 'oauth@example.com', password: 'Wrong!' }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([401, 401]);
    expect(responses.map((response) => response.body)).toEqual([
      { error: 'Invalid credentials' },
      { error: 'Invalid credentials' },
    ]);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
  });

  it('asks existing social-account owners to log in instead of creating a second account', async () => {
    await insertUser({
      email: CREDENTIALS.email,
      provider: 'google',
      providerId: 'google-user',
      name: 'OAuth',
    });
    const duplicate = await nativeSignup({ ...SIGNUP, email: '  MOBILE@EXAMPLE.COM  ' });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: 'Account already exist. Please login.',
      reason: 'account-exists',
    });
    expect(await usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
  });

  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'rejects valid credentials for a %s account',
    async (status) => {
      const user = await insertUser({ ...CREDENTIALS, provider: 'local', name: 'Owner' });
      await updateUser(user._id, { status });
      const response = await nativeLogin(CREDENTIALS);
      expect(response.status).toBe(403);
      expect(response.body.reason).toBe(`account-${status}`);
      expect(response.body.accessToken).toBeUndefined();
      expect(await refreshTokensCollection().countDocuments()).toBe(0);
    }
  );

  it('enforces the existing signup fields and password rules on both interfaces', async () => {
    const invalid = [
      { ...SIGNUP, name: 'A' },
      { ...SIGNUP, email: 'invalid' },
      { ...SIGNUP, password: 'short', confirmPassword: 'short' },
      { ...SIGNUP, password: 'lowercase1!', confirmPassword: 'lowercase1!' },
      { ...SIGNUP, password: 'NoNumber!', confirmPassword: 'NoNumber!' },
      { ...SIGNUP, password: 'NoSymbol12', confirmPassword: 'NoSymbol12' },
      { ...SIGNUP, confirmPassword: 'Different1!' },
    ];
    for (const body of invalid) {
      expect((await nativeSignup(body)).status).toBe(400);
      expect((await request(app).post('/api/v1/auth/signup').send(body)).status).toBe(400);
    }
    expect((await nativeLogin({ email: 'invalid', password: 'abc' })).status).toBe(400);
    expect(await usersCollection().countDocuments()).toBe(0);
  });

  it('lifts an expired suspension using the existing policy and records the lift once', async () => {
    const user = await insertUser({ ...CREDENTIALS, provider: 'local', name: 'Owner' });
    await updateUser(user._id, { status: 'suspended', statusUntil: new Date(Date.now() - 1) });
    const mobile = await nativeLogin(CREDENTIALS);
    expect(mobile.status).toBe(200);
    expect((await introspect(mobile.body.accessToken)).body.user.status).toBe('active');
    expect(await auditLogsCollection().countDocuments({ action: 'user.status.expired' })).toBe(1);
  });

  it('issues an independent native session that refreshes and revokes without browser cookies', async () => {
    const { browser } = await browserSession();
    const mobile = await nativeLogin(CREDENTIALS);
    const claims = JSON.parse(
      Buffer.from(mobile.body.accessToken.split('.')[1], 'base64url').toString()
    );
    expect(claims.nativeSessionId).toMatch(/^[a-f0-9]{24}$/);
    const refreshed = await nativeRefresh(mobile.body.refreshToken);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.user.id).toBe(mobile.body.user.id);
    expect(refreshed.headers['set-cookie']).toBeUndefined();
    expect((await nativeLogout(refreshed.body.refreshToken)).status).toBe(200);
    expect((await introspect(refreshed.body.accessToken)).status).toBe(401);
    expect((await nativeRefresh(refreshed.body.refreshToken)).status).toBe(401);
    expect((await browser.post('/api/v1/auth/refresh')).status).toBe(200);
  });
});
