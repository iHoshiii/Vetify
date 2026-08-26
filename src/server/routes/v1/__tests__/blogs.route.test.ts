import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { blogsCollection, insertBlog, updateBlog, type BlogAttrs } from '../../../models/blogs';
import { insertUser, type UserRole } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const DRAFT = {
  title: 'Spot early signs that your pet needs a vet visit',
  excerpt: 'Small changes in appetite and mood usually come first.',
  body: 'A longer piece of prose than any excerpt would carry, comfortably past the minimum.',
};

/** An account of the given role, plus a token that says so. */
async function account(role: UserRole, email = `${role}@example.com`) {
  const user = await insertUser({
    email,
    password: 'Sup3rSecret!',
    name: role,
    provider: 'local',
    role,
  });

  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role }),
  };
}

/** A post already in the database, by default by an author nobody here is signed in as. */
function seed(overrides: Partial<BlogAttrs> = {}) {
  return insertBlog({ ...DRAFT, author: new ObjectId(), ...overrides });
}

describe('GET /api/v1/blogs', () => {
  it('lists published posts, without shipping every body with them', async () => {
    await seed({ title: 'Live post', status: 'published' });
    await seed({ title: 'Still a draft' });

    const res = await request(app).get('/api/v1/blogs');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Live post');
    // The card only needs the excerpt. Nine full posts per page is a lot of text
    // to send for a screen nobody reads it on.
    expect(res.body.items[0].body).toBeUndefined();
    expect(res.body).toMatchObject({ page: 1, total: 1, pages: 1 });
  });

  it('refuses an oversized page instead of quietly clamping it', async () => {
    const res = await request(app).get('/api/v1/blogs?limit=100000');

    // Clamping would make `?limit=100000` look like it worked while the client
    // silently got 9 posts. Refusing keeps an unbounded scan unreachable and the
    // mistake visible.
    expect(res.status).toBe(400);
    expect(res.body.issues.limit).toBeTruthy();
  });

  it('passes a tag filter through to the query', async () => {
    await seed({ title: 'For dogs', status: 'published', tags: ['dogs'] });
    await seed({ title: 'For cats', status: 'published', tags: ['cats'] });

    const res = await request(app).get('/api/v1/blogs?tag=DOGS');

    // Upper case on the way in, lowercase in storage: the schema normalises it so
    // a shared link with a capitalised tag still finds anything.
    expect(res.body.items.map((item: { title: string }) => item.title)).toEqual(['For dogs']);
  });
});

describe('GET /api/v1/blogs/:slug', () => {
  it('returns a published post in full', async () => {
    const blog = await seed({ status: 'published' });

    const res = await request(app).get(`/api/v1/blogs/${blog.slug}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ slug: blog.slug, body: DRAFT.body });
  });

  it('answers a draft slug exactly as it answers one that never existed', async () => {
    const draft = await seed();

    const guessed = await request(app).get(`/api/v1/blogs/${draft.slug}`);
    const nonsense = await request(app).get('/api/v1/blogs/no-such-post');

    // Telling the two apart would confirm the post exists, which is the one thing
    // an unpublished draft is not supposed to reveal.
    expect(guessed.status).toBe(404);
    expect(guessed.body).toEqual(nonsense.body);
  });
});

describe('POST /api/v1/blogs', () => {
  const post = (token?: string, body: Record<string, unknown> = DRAFT) => {
    const req = request(app).post('/api/v1/blogs');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req.send(body);
  };

  it('turns away a caller with no token', async () => {
    const res = await post();

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('turns away a signed-in reader', async () => {
    const reader = await account('user');

    const res = await post(reader.token);

    // 403, not 401: logging in again will not help, which is the difference the
    // client needs in order to say something useful.
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('credits the token rather than the payload for authorship', async () => {
    const pro = await account('professional');
    const stranger = new ObjectId().toString();

    const res = await post(pro.token, { ...DRAFT, author: stranger });

    expect(res.status).toBe(201);
    // Posting under somebody else's name is not something the API lets a caller
    // express — the schema drops the field and the handler reads the token.
    expect(res.body.authorId).toBe(pro.user._id.toString());
    expect(res.body).toMatchObject({ status: 'draft', publishedAt: null });
    expect(res.body.slug).toBe('spot-early-signs-that-your-pet-needs-a-vet-visit');
  });

  it('refuses a moderation status from an author', async () => {
    const pro = await account('professional');

    const res = await post(pro.token, { ...DRAFT, status: 'hidden' });

    // 'hidden' and 'removed' are outcomes of a moderator's decision. If an author
    // could set them, they could also clear them.
    expect(res.status).toBe(400);
    expect(res.body.issues.status).toBeTruthy();
  });

  it('refuses a post with nothing in it', async () => {
    const pro = await account('professional');

    const res = await post(pro.token, { ...DRAFT, body: 'too short' });

    expect(res.status).toBe(400);
    expect(res.body.issues.body).toBeTruthy();
  });

  it('publishes clean writing, and records that it was looked at', async () => {
    const pro = await account('professional');

    const res = await post(pro.token, { ...DRAFT, status: 'published' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('published');

    // The verdict is kept on the post but is not part of what a reader receives.
    expect(res.body.moderation).toBeUndefined();
    const stored = await blogsCollection().findOne({ _id: new ObjectId(res.body.id as string) });
    expect(stored?.moderation?.outcome).toBe('clean');
  });

  it('holds a post the screen will not pass, rather than refusing it', async () => {
    const pro = await account('professional');

    const res = await post(pro.token, {
      ...DRAFT,
      body: `${DRAFT.body} Some faggot left their dog in the car again.`,
      status: 'published',
    });

    // 201, because the writing was accepted. It is simply not live: the author
    // keeps their draft and a human decides whether readers see it.
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('flagged');
    expect(res.body.publishedAt).toBeNull();

    const stored = await blogsCollection().findOne({ _id: new ObjectId(res.body.id as string) });
    expect(stored?.moderation).toMatchObject({ outcome: 'flagged', reviewedBy: null });
    expect(stored?.moderation?.terms).toContain('faggot');
    expect(stored?.moderation?.severity).toBeGreaterThan(0.9);
  });

  it('keeps a flagged post out of the public feed', async () => {
    const pro = await account('professional');
    await post(pro.token, {
      ...DRAFT,
      body: `${DRAFT.body} Buy xanax here with no prescription.`,
      status: 'published',
    });

    const feed = await request(app).get('/api/v1/blogs');

    expect(feed.body.items).toHaveLength(0);
  });

  it('does not screen a draft', async () => {
    const pro = await account('professional');

    const res = await post(pro.token, {
      ...DRAFT,
      body: `${DRAFT.body} Some faggot left their dog in the car again.`,
    });

    // Nobody can read a draft, so there is nothing to protect a reader from and no
    // model call to spend on writing that is not finished.
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');

    const stored = await blogsCollection().findOne({ _id: new ObjectId(res.body.id as string) });
    expect(stored?.moderation).toBeNull();
  });
});

describe('PATCH /api/v1/blogs/:id', () => {
  const patch = (id: string, token: string, body: Record<string, unknown>) =>
    request(app).patch(`/api/v1/blogs/${id}`).set('Authorization', `Bearer ${token}`).send(body);

  it('lets the author publish, which puts the post in the feed', async () => {
    const pro = await account('professional');
    const draft = await seed({ author: pro.user._id });

    const res = await patch(draft._id.toString(), pro.token, { status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.publishedAt).not.toBeNull();

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.items).toHaveLength(1);
  });

  it("refuses one professional editing another's post", async () => {
    const author = await account('professional', 'author@example.com');
    const other = await account('professional', 'other@example.com');
    const draft = await seed({ author: author.user._id });

    const res = await patch(draft._id.toString(), other.token, { title: 'Hijacked headline' });

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('not-author');
  });

  it('lets an admin edit anybody’s post', async () => {
    const admin = await account('admin');
    const draft = await seed();

    const res = await patch(draft._id.toString(), admin.token, { title: 'Corrected headline' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Corrected headline');
  });

  it('refuses the author of a post that is under moderation', async () => {
    const pro = await account('professional');
    const blog = await seed({ author: pro.user._id, status: 'published' });
    await updateBlog(blog._id, { status: 'hidden' });

    const res = await patch(blog._id.toString(), pro.token, { status: 'published' });

    // Otherwise a takedown lasts exactly as long as it takes the author to press
    // publish again.
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('under-moderation');
  });

  it('pulls a live post whose edit brings sensitive writing with it', async () => {
    const pro = await account('professional');
    const live = await seed({ author: pro.user._id, status: 'published' });

    const res = await patch(live._id.toString(), pro.token, {
      body: `${DRAFT.body} Some faggot left their dog in the car again.`,
    });

    // Editing a published post is the other way sensitive writing reaches the
    // feed, so a patch is screened on the result and not on whether the status
    // moved. The post leaves the feed the moment it stops passing.
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('flagged');

    const feed = await request(app).get('/api/v1/blogs');
    expect(feed.body.items).toHaveLength(0);
  });

  it('refuses the author of a post the screen is holding', async () => {
    const pro = await account('professional');
    const blog = await seed({ author: pro.user._id, status: 'flagged' });

    const res = await patch(blog._id.toString(), pro.token, { status: 'published' });

    // Otherwise the hold is a filter to iterate against until something slips
    // past it, which is worse than no filter at all.
    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('under-moderation');
  });

  it('refuses a patch that changes nothing', async () => {
    const pro = await account('professional');
    const draft = await seed({ author: pro.user._id });

    const res = await patch(draft._id.toString(), pro.token, {});

    expect(res.status).toBe(400);
  });

  it('answers 404 for an id that is not an id', async () => {
    const pro = await account('professional');

    const res = await patch('not-an-object-id', pro.token, { title: 'Whatever headline' });

    // Checked before the lookup, so a junk parameter cannot reach the driver and
    // come back as a 400 about ids or a 500.
    expect(res.status).toBe(404);
  });
});
