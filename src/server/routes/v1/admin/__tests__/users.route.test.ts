import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app';
import { auditLogsCollection } from '../../../../models/audit-log';
import { refreshTokensCollection } from '../../../../models/refresh-token';
import { findUserById, insertUser, type UserRole } from '../../../../models/users';
import { signAccessToken } from '../../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PASSWORD = 'Sup3rSecret!';
let seq = 0;

/** An account of the given role, plus a token that says so. */
async function account(role: UserRole = 'user', name?: string) {
  seq += 1;
  const email = `person${seq}@example.com`;
  const user = await insertUser({
    email,
    password: PASSWORD,
    name: name ?? `Person ${seq}`,
    provider: 'local',
    role,
  });

  return {
    user,
    email,
    token: signAccessToken({ sub: user._id.toString(), email, role }),
  };
}

const REASON = 'Repeatedly posted the same advertisement in the chat.';

describe('GET /api/v1/admin/users', () => {
  it('turns away a signed-in non-admin', async () => {
    const { token } = await account('user');

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('pages the list and never returns a password', async () => {
    const { token } = await account('admin');
    await account('user');
    await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/users?limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.pages).toBe(2);
    for (const item of res.body.items) {
      expect(item).not.toHaveProperty('password');
      expect(item).toHaveProperty('status');
    }
  });

  it('refuses a page size above the cap', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/users?limit=100000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('filters by role', async () => {
    const { token } = await account('admin');
    await account('professional');
    await account('user');

    const res = await request(app)
      .get('/api/v1/admin/users?role=professional')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].role).toBe('professional');
  });

  it('searches by name as well as email', async () => {
    const { token } = await account('admin');
    const { email } = await account('user', 'Grace Hopper');

    const byName = await request(app)
      .get('/api/v1/admin/users?q=hopper')
      .set('Authorization', `Bearer ${token}`);
    expect(byName.body.items.map((i: { email: string }) => i.email)).toEqual([email]);

    const byEmail = await request(app)
      .get(`/api/v1/admin/users?q=${email.slice(0, 8)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(byEmail.body.items.map((i: { email: string }) => i.email)).toEqual([email]);
  });

  it('treats a regex in the search box as text', async () => {
    const { token } = await account('admin');
    await account('user');

    const res = await request(app)
      .get('/api/v1/admin/users?q=.%2A')
      .set('Authorization', `Bearer ${token}`);

    // '.*' would match every account if it reached the engine unescaped.
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });
});

describe('PATCH /api/v1/admin/users/:id/role', () => {
  it('promotes an account and records who did it', async () => {
    const { user: admin, token } = await account('admin');
    const { user: target } = await account('user');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'professional' });

    expect(res.status).toBe(200);
    expect(res.body.roleFrom).toBe('user');
    expect(res.body.roleTo).toBe('professional');
    expect(res.body.user.role).toBe('professional');

    const entries = await auditLogsCollection().find({}).toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ action: 'user.role.changed', actorEmail: admin.email });
    expect(entries[0].metadata).toMatchObject({ roleFrom: 'user', roleTo: 'professional' });
  });

  it('refuses an admin changing their own role', async () => {
    const { user, token } = await account('admin');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${user._id.toString()}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'user' });

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('self-role-change');
    expect((await findUserById(user._id))?.role).toBe('admin');
  });

  it('demotes a second admin, since one is left standing', async () => {
    const { token } = await account('admin');
    const { user: other } = await account('admin');

    // The last-admin guard must not fire here: two admins exist, so demoting one
    // still leaves somebody able to sign in. Reaching the guard itself needs a
    // caller that is not an admin, which is covered in the service tests.
    const res = await request(app)
      .patch(`/api/v1/admin/users/${other._id.toString()}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'user' });

    expect(res.status).toBe(200);
    expect((await findUserById(other._id))?.role).toBe('user');
  });

  it('409s when the account already has that role', async () => {
    const { token } = await account('admin');
    const { user: target } = await account('professional');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'professional' });

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('already-professional');
  });

  it('404s for an account that does not exist', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${new ObjectId().toString()}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });

    expect(res.status).toBe(404);
  });

  it('rejects a role the vocabulary does not contain', async () => {
    const { token } = await account('admin');
    const { user: target } = await account('user');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/role`)
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'superuser' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/v1/admin/users/:id/status', () => {
  it('refuses a ban with no reason', async () => {
    const { token } = await account('admin');
    const { user: target } = await account('user');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'banned' });

    expect(res.status).toBe(400);
    expect((await findUserById(target._id))?.status).toBe('active');
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });

  it('bans the account, stamps the trail, and closes every open session', async () => {
    const { user: admin, token } = await account('admin');
    const { user: target, email } = await account('user');

    // A real session, so the revocation has something to revoke.
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email, password: PASSWORD }).expect(200);

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'banned', reason: REASON });

    expect(res.status).toBe(200);
    expect(res.body.statusTo).toBe('banned');
    expect(res.body.sessionsRevoked).toBe(1);
    expect(res.body.user.statusReason).toBe(REASON);
    expect(res.body.user.statusChangedBy).toBe(admin._id.toString());

    expect(
      await refreshTokensCollection().countDocuments({ user: target._id, revokedAt: null })
    ).toBe(0);

    // The point of the revocation: the 30-day cookie can no longer mint tokens.
    const refreshed = await agent.post('/api/v1/auth/refresh');
    expect(refreshed.status).toBe(401);
  });

  it('suspends without touching the role', async () => {
    const { token } = await account('admin');
    const { user: target } = await account('professional');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'suspended', reason: REASON });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('suspended');
    expect(res.body.user.role).toBe('professional');
  });

  it('reinstates without a reason and clears the note', async () => {
    const { token } = await account('admin');
    const { user: target } = await account('user');

    await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'suspended', reason: REASON })
      .expect(200);

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.user.status).toBe('active');
    expect(res.body.user.statusReason).toBeNull();
    expect(res.body.sessionsRevoked).toBe(0);
  });

  it('refuses an admin banning themselves', async () => {
    const { user, token } = await account('admin');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${user._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'banned', reason: REASON });

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('self-status-change');
    expect((await findUserById(user._id))?.status).toBe('active');
  });

  it('409s when the account is already in that status', async () => {
    const { token } = await account('admin');
    const { user: target } = await account('user');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target._id.toString()}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'active' });

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('already-active');
  });
});

describe('the gate re-reads the account', () => {
  it('refuses a demoted admin on their next request, token still valid', async () => {
    const { token: senior } = await account('admin');
    const { user: junior, token: juniorToken } = await account('admin');

    // The token still says admin and still verifies — only the stored role moved.
    await request(app)
      .patch(`/api/v1/admin/users/${junior._id.toString()}/role`)
      .set('Authorization', `Bearer ${senior}`)
      .send({ role: 'user' })
      .expect(200);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${juniorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('refuses a banned admin on their next request', async () => {
    const { token: senior } = await account('admin');
    const { user: junior, token: juniorToken } = await account('admin');

    await request(app)
      .patch(`/api/v1/admin/users/${junior._id.toString()}/status`)
      .set('Authorization', `Bearer ${senior}`)
      .send({ status: 'banned', reason: REASON })
      .expect(200);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${juniorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('account-banned');
  });
});
