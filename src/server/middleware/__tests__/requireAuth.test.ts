import express, { type Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  insertUser,
  updateUser,
  usersCollection,
  type User,
  type UserRole,
} from '../../models/users';
import { signAccessToken } from '../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { errorHandler } from '../errorHandler';
import { optionalAuth } from '../optionalAuth';
import { requireAuth, requireRole } from '../requireAuth';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

/**
 * Minimal app exposing both gates, so the tests exercise the middleware itself
 * rather than whatever the admin router happens to mount today.
 */
function makeApp(): Express {
  const app = express();

  app.get('/signed-in', optionalAuth, requireAuth, (req, res) => {
    res.json({ userId: req.auth?.userId, role: req.auth?.role });
  });

  app.get('/admin-only', optionalAuth, requireRole('admin'), (req, res) => {
    // Echoes what the gate attached, which is what handlers behind it rely on.
    res.json({ email: req.currentUser?.email, role: req.auth?.role });
  });

  app.get('/staff', optionalAuth, requireRole('professional', 'admin'), (_req, res) => {
    res.json({ ok: true });
  });

  app.use(errorHandler);
  return app;
}

const app = makeApp();

function makeUser(role: UserRole = 'user'): Promise<User> {
  return insertUser({
    email: `${role}@example.com`,
    password: 'Sup3rSecret!',
    provider: 'local',
    role,
  });
}

/** A real, correctly signed token — the role claim is whatever we say it is. */
function tokenFor(user: Pick<User, '_id' | 'email'>, role: UserRole): string {
  return signAccessToken({ sub: user._id.toString(), email: user.email, role });
}

const authed = (path: string, token: string) =>
  request(app).get(path).set('Authorization', `Bearer ${token}`);

describe('requireAuth', () => {
  it('refuses a request with no token', async () => {
    const res = await request(app).get('/signed-in');

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('refuses a token that does not verify', async () => {
    const res = await authed('/signed-in', 'not.a.jwt');

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('lets any signed-in caller through, whatever their role', async () => {
    const user = await makeUser('user');
    const res = await authed('/signed-in', tokenFor(user, 'user'));

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user._id.toString());
  });
});

describe('requireRole', () => {
  it('answers 401, not 403, when nobody is signed in', async () => {
    // The distinction matters to the client: logging in fixes one and never the
    // other.
    const res = await request(app).get('/admin-only');

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('refuses a role that is not on the list', async () => {
    const user = await makeUser('user');
    const res = await authed('/admin-only', tokenFor(user, 'user'));

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('admits an admin and attaches the stored user', async () => {
    const admin = await makeUser('admin');
    const res = await authed('/admin-only', tokenFor(admin, 'admin'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'admin@example.com', role: 'admin' });
  });

  it('accepts any of several allowed roles', async () => {
    const vet = await makeUser('professional');

    await expect(
      authed('/staff', tokenFor(vet, 'professional')).then((r) => r.status)
    ).resolves.toBe(200);
  });
});

describe('requireRole reads the stored role, not the token', () => {
  it('refuses a demoted admin still holding an admin token', async () => {
    const admin = await makeUser('admin');
    const token = tokenFor(admin, 'admin');

    await expect(authed('/admin-only', token).then((r) => r.status)).resolves.toBe(200);

    // The token is untouched and still perfectly valid for its full lifetime.
    await updateUser(admin._id, { role: 'user' });

    const res = await authed('/admin-only', token);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('refuses a promotion that only exists in the token', async () => {
    const user = await makeUser('user');
    const res = await authed('/admin-only', tokenFor(user, 'admin'));

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('overwrites req.auth.role with the stored role', async () => {
    const vet = await makeUser('professional');
    // Token claims 'admin', storage says 'professional'; /staff admits both, so
    // the request gets through and shows which one the gate believed.
    const res = await authed('/staff', tokenFor(vet, 'admin'));

    expect(res.status).toBe(200);
  });
});

describe('requireRole and account standing', () => {
  it.each(['suspended', 'banned'] as const)('refuses a %s admin', async (status) => {
    const admin = await makeUser('admin');
    const token = tokenFor(admin, 'admin');

    await updateUser(admin._id, { status });

    const res = await authed('/admin-only', token);
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe(`account-${status}`);
  });

  it('refuses a token whose account has been deleted', async () => {
    const admin = await makeUser('admin');
    const token = tokenFor(admin, 'admin');

    await usersCollection().deleteOne({ _id: admin._id });

    const res = await authed('/admin-only', token);
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('no-account');
  });

  it('reports a malformed subject as a dead session, not a bad request', async () => {
    // A 400 here would blame the caller for an id they never sent.
    const res = await authed(
      '/admin-only',
      signAccessToken({ sub: 'not-an-object-id', email: 'x@example.com', role: 'admin' })
    );

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('bad-subject');
  });
});
