import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import * as users from '../../../models/users';
import { refreshTokensCollection } from '../../../models/refresh-token';
import { findOrCreateOAuthUser } from '../../../services/auth.service';
import { app, CREDENTIALS } from './native-auth-fixtures';
import { mailFetch, setupVerificationDb, type AuthSurface } from './email-verification-fixtures';

const SIGNUP = { ...CREDENTIALS, name: 'Account Owner', confirmPassword: CREDENTIALS.password };
const EXISTS = { error: 'Account already exist. Please login', reason: 'account-exists' };
const MISSING = { error: 'Create an account first to use the app.', reason: 'account-not-found' };
const register = (surface: AuthSurface, email = CREDENTIALS.email) =>
  request(app)
    .post(`/api/v1/auth${surface}/signup`)
    .send({ ...SIGNUP, email });
const login = (surface: AuthSurface, body: object) =>
  request(app).post(`/api/v1/auth${surface}/login`).send(body);
function expectNoSession(response: request.Response): void {
  expect(response.body.accessToken).toBeUndefined();
  expect(response.body.refreshToken).toBeUndefined();
  expect(response.headers['set-cookie']).toBeUndefined();
}

setupVerificationDb();

describe.each(['', '/native'] as AuthSurface[])('local account errors on %s auth', (surface) => {
  it('normalizes an unknown login email and asks the user to create an account', async () => {
    const response = await login(surface, { ...CREDENTIALS, email: '  MISSING@EXAMPLE.COM  ' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual(MISSING);
    expectNoSession(response);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
    expect(await users.usersCollection().countDocuments()).toBe(0);
    expect(mailFetch).not.toHaveBeenCalled();
  });

  it('rejects a normalized duplicate signup with the exact login message', async () => {
    expect((await register(surface)).status).toBe(200);
    const duplicate = await register(surface, '  MOBILE@EXAMPLE.COM  ');
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual(EXISTS);
    expectNoSession(duplicate);
    expect(await users.usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
    expect(mailFetch).toHaveBeenCalledTimes(1);
  });

  it('returns the same duplicate message when concurrent inserts reach the email unique index', async () => {
    const lookup = users.findUserByEmail;
    let checked = 0;
    let release = () => {};
    const bothChecked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reads = vi.spyOn(users, 'findUserByEmail').mockImplementation(async (email) => {
      const existing = await lookup(email);
      expect(existing).toBeNull();
      if (++checked === 2) release();
      await bothChecked;
      return existing;
    });
    const responses = await Promise.all([
      register(surface),
      register(surface, '  MOBILE@EXAMPLE.COM  '),
    ]);
    expect(reads).toHaveBeenCalledTimes(2);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const duplicate = responses.find((response) => response.status === 409)!;
    expect(duplicate.body).toEqual(EXISTS);
    expectNoSession(duplicate);
    expect(await users.usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(1);
    expect(mailFetch).toHaveBeenCalledTimes(1);
  });

  it('preserves a Google professional account and its login when local signup is attempted', async () => {
    const owner = await users.insertUser({
      email: CREDENTIALS.email,
      name: 'Social Owner',
      provider: 'google',
      providerId: 'google-owner',
      emailVerified: true,
      role: 'professional',
    });
    const original = await users.findUserWithPasswordByEmail(CREDENTIALS.email);
    const duplicate = await register(surface, '  MOBILE@EXAMPLE.COM  ');
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual(EXISTS);
    expectNoSession(duplicate);
    const stored = await users.findUserWithPasswordByEmail(CREDENTIALS.email);
    expect(stored).toEqual(original);
    expect(await users.usersCollection().countDocuments()).toBe(1);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
    expect(mailFetch).not.toHaveBeenCalled();
    const signedIn = await findOrCreateOAuthUser('google', {
      providerId: 'google-owner',
      email: CREDENTIALS.email,
      emailVerified: true,
      name: owner.name,
      avatarUrl: null,
    });
    expect(signedIn).toEqual(owner);
  });

  it('keeps a wrong password generic and never creates a session', async () => {
    await users.insertUser({ ...CREDENTIALS, name: 'Owner', provider: 'local' });
    const response = await login(surface, { ...CREDENTIALS, password: 'Wrong!' });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Invalid credentials' });
    expectNoSession(response);
    expect(await refreshTokensCollection().countDocuments()).toBe(0);
    expect(mailFetch).not.toHaveBeenCalled();
  });
});
