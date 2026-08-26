import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../../app';
import { auditLogsCollection } from '../../../../models/audit-log';
import { blogsCollection, insertBlog, updateBlog, type BlogStatus } from '../../../../models/blogs';
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
  const user = await insertUser({
    email: `admin${seq}@example.com`,
    password: 'Sup3rSecret!',
    name: `Person ${seq}`,
    provider: 'local',
    role,
  });

  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role }),
  };
}

/** A post by `author`, in the given status. */
async function post(author: ObjectId, status: BlogStatus = 'published') {
  seq += 1;
  const blog = await insertBlog({
    title: `Caring for a senior cat ${seq}`,
    excerpt: 'What changes in the last few years, and what to watch for at home.',
    body: 'Older cats hide pain well, so the signs worth watching are the small ones.',
    tags: ['cats'],
    author,
    status: status === 'published' || status === 'draft' ? status : 'published',
  });

  // Moderation statuses are not something insertBlog accepts — the author schema
  // deliberately cannot express them — so they are set after the fact.
  if (status !== blog.status) {
    const moved = await updateBlog(blog._id, { status });
    return moved!;
  }

  return blog;
}

const REASON = 'Copies a paywalled article almost word for word.';

/** A post as the screen would have left it: held, with a verdict to order it by. */
async function flagged(author: ObjectId, severity: number) {
  const blog = await post(author);

  return (await updateBlog(blog._id, {
    status: 'flagged',
    moderation: {
      outcome: 'flagged',
      categories: ['slur'],
      severity,
      terms: ['a blocked term'],
      notes: 'Matched a blocked term.',
      model: null,
      checkedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
    },
  }))!;
}

describe('GET /api/v1/admin/blogs', () => {
  it('turns away a caller with no token', async () => {
    const res = await request(app).get('/api/v1/admin/blogs');

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('turns away a signed-in non-admin', async () => {
    const { token } = await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/blogs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('lists every status, unlike the public feed', async () => {
    const { user, token } = await account('admin');
    await post(user._id, 'published');
    await post(user._id, 'draft');
    await post(user._id, 'removed');

    const res = await request(app)
      .get('/api/v1/admin/blogs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((item: { status: string }) => item.status).sort()).toEqual([
      'draft',
      'published',
      'removed',
    ]);
  });

  it('names the author on each row', async () => {
    const { user, token } = await account('admin');
    await post(user._id);

    const res = await request(app)
      .get('/api/v1/admin/blogs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.items[0].author).toMatchObject({ id: user._id.toString(), email: user.email });
    // The projection that keeps passwords out of reads has to survive the join.
    expect(res.body.items[0].author).not.toHaveProperty('password');
  });

  it('filters by status', async () => {
    const { user, token } = await account('admin');
    await post(user._id, 'published');
    await post(user._id, 'draft');

    const res = await request(app)
      .get('/api/v1/admin/blogs?status=draft')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].status).toBe('draft');
  });

  it('refuses a page size above the cap rather than scanning the collection', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/blogs?limit=100000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/admin/blogs/:id', () => {
  it('returns the post with its body', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id, 'draft');

    const res = await request(app)
      .get(`/api/v1/admin/blogs/${blog._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.body).toBe(blog.body);
    expect(res.body.status).toBe('draft');
  });

  it('404s on a malformed id instead of throwing', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/blogs/not-an-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/admin/blogs/:id/remove', () => {
  it('refuses a takedown with no reason', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });

  it('refuses a reason too short to explain anything', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'spam' });

    expect(res.status).toBe(400);
  });

  it('takes the post down, records the trail, and drops it from the public feed', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    expect(res.status).toBe(200);
    expect(res.body.statusFrom).toBe('published');
    expect(res.body.statusTo).toBe('removed');
    expect(res.body.blog.removedReason).toBe(REASON);
    expect(res.body.blog.removedBy).toBe(user._id.toString());
    expect(res.body.blog.removedAt).not.toBeNull();

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.total).toBe(0);

    const slug = await request(app).get(`/api/v1/blogs/${blog.slug}`);
    expect(slug.status).toBe(404);
  });

  it('writes one audit entry naming the actor, the target and the reason', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    const entries = await auditLogsCollection().find({}).toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'blog.removed',
      targetType: 'blog',
      actorEmail: user.email,
      reason: REASON,
    });
    expect(entries[0].actor?.toString()).toBe(user._id.toString());
    expect(entries[0].targetId.toString()).toBe(blog._id.toString());
    expect(entries[0].metadata).toMatchObject({ statusFrom: 'published', statusTo: 'removed' });
  });

  it('409s on a post already removed', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id, 'removed');

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('already-removed');
  });

  it('404s for a post that does not exist', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${new ObjectId().toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/admin/blogs/:id/hide', () => {
  it('hides without demanding a reason', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/hide`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.blog.status).toBe('hidden');
    // Reversible, so nothing is stamped into the removal trail.
    expect(res.body.blog.removedAt).toBeNull();
  });

  it('accepts an empty reason from a form that always sends the field', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/hide`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '' });

    expect(res.status).toBe(200);
  });

  it('leaves the post out of the public feed', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/hide`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Checking a claim in the third paragraph.' });

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.total).toBe(0);
  });
});

describe('PATCH /api/v1/admin/blogs/:id/restore', () => {
  it('puts a removed post back where it was and clears the trail', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.statusTo).toBe('published');
    expect(res.body.blog.removedReason).toBeNull();
    expect(res.body.blog.removedBy).toBeNull();
    expect(res.body.blog.removedAt).toBeNull();

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.total).toBe(1);
  });

  it('returns a taken-down draft to draft rather than publishing it', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id, 'draft');

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.body.statusTo).toBe('draft');

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.total).toBe(0);
  });

  it('409s on a post that is not under moderation', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('not-under-moderation');
  });

  it('keeps both the takedown and the restore in the audit log', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });
    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const actions = await auditLogsCollection()
      .find({})
      .sort({ createdAt: 1 })
      .map((entry) => entry.action)
      .toArray();

    expect(actions).toEqual(['blog.removed', 'blog.restored']);
  });
});

describe('PATCH /api/v1/admin/blogs/:id/approve', () => {
  it('publishes a held post and records who cleared it', async () => {
    const { user, token } = await account('admin');
    const blog = await flagged(user._id, 0.9);

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.statusFrom).toBe('flagged');
    expect(res.body.statusTo).toBe('published');

    // The verdict is left as the screen wrote it and the review is stamped beside
    // it: overruling a filter should not erase the reason it fired.
    expect(res.body.blog.moderation.outcome).toBe('flagged');
    expect(res.body.blog.moderation.reviewedBy).toBe(user._id.toString());
    expect(res.body.blog.moderation.reviewedAt).not.toBeNull();

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.total).toBe(1);
  });

  it('writes an audit entry for the override', async () => {
    const { user, token } = await account('admin');
    const blog = await flagged(user._id, 0.7);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    const entries = await auditLogsCollection().find({ targetId: blog._id }).toArray();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'blog.approved',
      actorEmail: user.email,
      metadata: { statusFrom: 'flagged', statusTo: 'published' },
    });
  });

  it('409s on a post nothing is holding', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id, 'draft');

    const res = await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Otherwise approve is a second, unaudited way to publish somebody's
    // unfinished draft.
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('not-flagged');
  });
});

describe('the review queue order', () => {
  it('puts held posts first, worst verdict at the top', async () => {
    const { user, token } = await account('admin');

    // Written in the order that would come back if updatedAt alone decided.
    const mild = await flagged(user._id, 0.6);
    const severe = await flagged(user._id, 0.95);
    const untouched = await post(user._id);

    const res = await request(app)
      .get('/api/v1/admin/blogs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.items.map((item: { id: string }) => item.id)).toEqual([
      severe._id.toString(),
      mild._id.toString(),
      untouched._id.toString(),
    ]);
  });
});

describe('DELETE /api/v1/admin/blogs/:id', () => {
  const purge = (id: string, token: string, body: Record<string, unknown> = { reason: REASON }) =>
    request(app)
      .delete(`/api/v1/admin/blogs/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('refuses a post that has not been taken down first', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    const res = await purge(blog._id.toString(), token);

    // The reversible step comes first, so a mistake stays recoverable until
    // somebody deliberately comes back to finish it.
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('not-removed');
    expect(await blogsCollection().countDocuments()).toBe(1);
  });

  it('refuses a held post as well, however bad the verdict', async () => {
    const { user, token } = await account('admin');
    const blog = await flagged(user._id, 0.99);

    const res = await purge(blog._id.toString(), token);

    expect(res.status).toBe(409);
    expect(await blogsCollection().countDocuments()).toBe(1);
  });

  it('refuses a deletion with no reason', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);
    await updateBlog(blog._id, { status: 'removed' });

    const res = await purge(blog._id.toString(), token, {});

    expect(res.status).toBe(400);
    expect(await blogsCollection().countDocuments()).toBe(1);
  });

  it('deletes a taken-down post and leaves the audit trail behind it', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);

    await request(app)
      .patch(`/api/v1/admin/blogs/${blog._id.toString()}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: REASON });

    const res = await purge(blog._id.toString(), token, {
      reason: 'The author asked for it to be erased.',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: blog._id.toString(), slug: blog.slug });
    expect(await blogsCollection().countDocuments()).toBe(0);

    // The takedown and the deletion both survive the post they were about, which
    // is the point of keeping the record somewhere other than on the row.
    const entries = await auditLogsCollection()
      .find({ targetId: blog._id })
      .sort({ createdAt: 1 })
      .toArray();

    expect(entries.map((entry) => entry.action)).toEqual(['blog.removed', 'blog.purged']);
    expect(entries[1]?.metadata).toMatchObject({ slug: blog.slug, title: blog.title });
  });

  it('404s once the post is gone', async () => {
    const { user, token } = await account('admin');
    const blog = await post(user._id);
    await updateBlog(blog._id, { status: 'removed' });

    await purge(blog._id.toString(), token);
    const again = await purge(blog._id.toString(), token);

    expect(again.status).toBe(404);
  });
});
