import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app';
import { recordAudit } from '../../../../models/audit-log';
import { insertUser, type UserRole } from '../../../../models/users';
import { signAccessToken } from '../../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

/** An account of the given role, plus a token that says so. */
async function account(role: UserRole = 'user') {
  seq += 1;
  const email = `admin${seq}@example.com`;
  const user = await insertUser({
    emailVerified: true,
    email,
    password: 'Sup3rSecret!',
    name: `Person ${seq}`,
    provider: 'local',
    role,
  });

  return { user, email, token: signAccessToken({ sub: user._id.toString(), email, role }) };
}

/** An entry written straight to the log, for filtering fixtures. */
function entry(overrides: Partial<Parameters<typeof recordAudit>[0]> = {}) {
  return recordAudit({
    action: 'blog.hidden',
    targetType: 'blog',
    targetId: new ObjectId(),
    actor: new ObjectId(),
    actorEmail: 'someone@example.com',
    ...overrides,
  });
}

describe('GET /api/v1/admin/audit', () => {
  it('turns away a caller with no token', async () => {
    const res = await request(app).get('/api/v1/admin/audit');

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('turns away a signed-in non-admin', async () => {
    const { token } = await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('pages the trail', async () => {
    const { token } = await account('admin');
    await entry();
    await entry();
    await entry();

    const res = await request(app)
      .get('/api/v1/admin/audit?limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, limit: 2, total: 3, pages: 2 });
    expect(res.body.items).toHaveLength(2);
  });

  it('refuses a page size above the cap', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/audit?limit=100000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('refuses an action outside the vocabulary rather than returning nothing', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/audit?action=blog.exploded')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/admin/audit — filters', () => {
  it('filters by action', async () => {
    const { token } = await account('admin');
    await entry({ action: 'blog.removed' });
    await entry({ action: 'user.role.changed', targetType: 'user' });

    const res = await request(app)
      .get('/api/v1/admin/audit?action=blog.removed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].action).toBe('blog.removed');
  });

  it('shows everything ever done to one target', async () => {
    const { token } = await account('admin');
    const target = new ObjectId();
    await entry({ action: 'blog.removed', targetId: target });
    await entry({ action: 'blog.restored', targetId: target });
    await entry({ action: 'blog.hidden' });

    const res = await request(app)
      .get(`/api/v1/admin/audit?targetType=blog&targetId=${target.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { action: string }) => i.action).sort()).toEqual([
      'blog.removed',
      'blog.restored',
    ]);
  });

  it('shows everything one admin has done', async () => {
    const { token } = await account('admin');
    const actor = new ObjectId();
    await entry({ actor, actorEmail: 'mine@example.com' });
    await entry();

    const res = await request(app)
      .get(`/api/v1/admin/audit?actor=${actor.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].actorEmail).toBe('mine@example.com');
  });

  it('refuses a malformed id instead of quietly matching nothing', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/audit?actor=not-an-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});
