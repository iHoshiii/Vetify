import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app';
import { recordAudit } from '../../../../models/audit-log';
import { insertBlog } from '../../../../models/blogs';
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
    email,
    password: 'Sup3rSecret!',
    name: `Person ${seq}`,
    provider: 'local',
    role,
  });

  return { user, email, token: signAccessToken({ sub: user._id.toString(), email, role }) };
}

/** A post to have something real to act on. */
async function post(author: ObjectId) {
  seq += 1;
  return await insertBlog({
    title: `Caring for a senior cat ${seq}`,
    excerpt: 'What changes in the last few years, and what to watch for at home.',
    body: 'Older cats hide pain well, so the signs worth watching are the small ones.',
    tags: ['cats'],
    author,
    status: 'published',
  });
}

const REASON = 'Copies a paywalled article almost word for word.';

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

describe('the trail an admin actually leaves', () => {
  it('records a takedown the audit screen can explain on its own', async () => {
    const admin = await account('admin');
    const author = await account('professional');
    const blog = await post(author.user._id);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: REASON })
      .expect(200);

    const res = await request(app)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      action: 'blog.removed',
      targetType: 'blog',
      targetId: blog._id.toString(),
      actor: admin.user._id.toString(),
      actorEmail: admin.email,
      reason: REASON,
    });
    // Enough context to read the row without going to look at the post, which
    // is the point of copying it in at write time.
    expect(res.body.items[0].metadata).toMatchObject({
      slug: blog.slug,
      statusFrom: 'published',
      statusTo: 'removed',
    });
    expect(res.body.items[0].ip).toBeTruthy();
    expect(res.body.items[0].createdAt).toBeTruthy();
  });

  it('reads newest first, so the last thing done is the first thing seen', async () => {
    const admin = await account('admin');
    const author = await account('professional');
    const blog = await post(author.user._id);
    const id = blog._id.toString();

    await request(app)
      .patch(`/api/v1/admin/blogs/${id}/remove`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ reason: REASON })
      .expect(200);
    await request(app)
      .patch(`/api/v1/admin/blogs/${id}/restore`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({})
      .expect(200);

    const res = await request(app)
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.body.items.map((i: { action: string }) => i.action)).toEqual([
      'blog.restored',
      'blog.removed',
    ]);
  });
});
