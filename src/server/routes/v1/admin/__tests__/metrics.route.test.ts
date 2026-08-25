import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { activityEventsCollection, type ActivityType } from '../../../../models/activity-event';
import { blogsCollection, insertBlog, type BlogStatus } from '../../../../models/blogs';
import { insertProfessional } from '../../../../models/professionals';
import { insertUser, type UserRole, type UserStatus } from '../../../../models/users';
import { createApp } from '../../../../app';
import { signAccessToken } from '../../../../services/auth.service';
import { clearMetricsCache } from '../../../../services/metrics.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);

// The cache outlives a cleared database, which is the one way these tests could
// pass by reading each other's numbers. Cleared here rather than trusted to be
// cold, so the order tests run in cannot matter.
afterEach(async () => {
  clearMetricsCache();
  await clearTestDb();
});

afterAll(stopTestDb);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Midday, UTC, `days` ago.
 *
 * Noon rather than now: a fixture written at 00:30 local time would land on
 * yesterday in UTC, and the assertions here are about which bucket a row falls
 * in. Midday is far enough from both boundaries to survive any offset.
 */
function daysAgo(days: number): Date {
  const now = new Date();
  const noon = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12);

  return new Date(noon - days * DAY_MS);
}

function isoDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

let seq = 0;

/** An account of the given role and status, plus a token that says so. */
async function account(role: UserRole = 'user', status: UserStatus = 'active') {
  seq += 1;
  const email = `metrics${seq}@example.com`;
  const user = await insertUser({
    email,
    password: 'Sup3rSecret!',
    name: `Person ${seq}`,
    provider: 'local',
    role,
    status,
  });

  return { user, email, token: signAccessToken({ sub: user._id.toString(), email, role }) };
}

/** Events of one type, one per entry, each dated that many days back. */
async function events(type: ActivityType, days: number[]) {
  await activityEventsCollection().insertMany(
    days.map((offset) => ({
      _id: new ObjectId(),
      type,
      user: null,
      anonId: null,
      metadata: {},
      createdAt: daysAgo(offset),
      expiresAt: new Date(Date.now() + 90 * DAY_MS),
    }))
  );
}

/** A post of the given status, written that many days ago. */
async function post(status: BlogStatus = 'published', offset = 0) {
  seq += 1;
  const blog = await insertBlog({
    title: `Caring for a senior cat ${seq}`,
    excerpt: 'What changes in the last few years, and what to watch for at home.',
    body: 'Older cats hide pain well, so the signs worth watching are the small ones.',
    tags: ['cats'],
    author: new ObjectId(),
    status: status === 'draft' ? 'draft' : 'published',
  });

  // Straight to the collection: `createdAt` is set by the repository and the
  // moderated statuses are only reachable through a decision, neither of which
  // this fixture is testing.
  await blogsCollection().updateOne(
    { _id: blog._id },
    { $set: { status, createdAt: daysAgo(offset) } }
  );

  return blog;
}

/** An application on file for a fresh account. */
async function application(status: 'pending' | 'verified' | 'rejected' = 'pending') {
  const { user } = await account();
  seq += 1;

  return await insertProfessional({
    user: user._id,
    licenseNumber: `SEED-${seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    credentialUrls: ['https://example.com/licence.pdf'],
    specialties: ['surgery'],
    clinicName: 'Seed Veterinary',
    clinicAddress: '9 Rizal Avenue, Cebu City',
    bio: 'A practice long enough established to have a listing worth reading.',
    yearsExperience: 8,
    backgroundCheckConsent: true,
    status,
  });
}

describe('GET /api/v1/admin/metrics/overview', () => {
  it('turns away a caller with no token', async () => {
    const res = await request(app).get('/api/v1/admin/metrics/overview');

    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('unauthenticated');
  });

  it('turns away a signed-in non-admin', async () => {
    const { token } = await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/metrics/overview')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('forbidden');
  });

  it('counts what exists, all-time, whatever the window', async () => {
    const { token } = await account('admin');
    await account('professional');
    await account();
    await post('published', 200);
    await post('draft');
    await post('removed');
    await application('pending');
    await application('verified');

    const res = await request(app)
      .get('/api/v1/admin/metrics/overview?days=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // Two of the accounts above belong to applicants, so five in total.
    expect(res.body.totals).toMatchObject({
      users: 5,
      admins: 1,
      professionals: 1,
      pendingApplications: 1,
      blogs: 3,
      // The published post is 200 days old and still counted: a total is not a window.
      publishedBlogs: 1,
      moderatedBlogs: 1,
    });
    expect(typeof res.body.generatedAt).toBe('string');
  });

  it('leaves a suspended admin out of the admin count', async () => {
    const { token } = await account('admin');
    await account('admin', 'suspended');

    const res = await request(app)
      .get('/api/v1/admin/metrics/overview')
      .set('Authorization', `Bearer ${token}`);

    // Both are admins by role; one of them cannot act, and this number sits next
    // to the guard that refuses to demote the last one who can.
    expect(res.body.totals.users).toBe(2);
    expect(res.body.totals.admins).toBe(1);
  });

  it('compares the window with the same span before it', async () => {
    const { token } = await account('admin');
    await events('user.signed_up', [0, 2, 5, 6]);
    await events('user.signed_up', [7, 9]);
    // Just outside both windows, to prove the far edge is closed.
    await events('user.signed_up', [14]);

    const res = await request(app)
      .get('/api/v1/admin/metrics/overview?days=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.trend.signups).toEqual({ current: 4, previous: 2, change: 100 });
  });

  it('reports no percentage when the previous span was empty', async () => {
    const { token } = await account('admin');
    await events('chat.message_sent', [0, 1]);

    const res = await request(app)
      .get('/api/v1/admin/metrics/overview?days=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.trend.chats).toEqual({ current: 2, previous: 0, change: null });
  });

  it('draws the blogs trend from the posts themselves, not from events', async () => {
    const { token } = await account('admin');
    await post('published', 3);
    await post('draft', 40);

    const res = await request(app)
      .get('/api/v1/admin/metrics/overview?days=7')
      .set('Authorization', `Bearer ${token}`);

    // No activity type is recorded for writing a post, so a count of one here can
    // only have come from the blogs collection. The draft is far outside both windows.
    expect(res.body.trend.blogs).toEqual({ current: 1, previous: 0, change: null });
  });
});

describe('GET /api/v1/admin/metrics/timeseries', () => {
  it('returns one point per day, oldest first, gaps filled', async () => {
    const { token } = await account('admin');
    await events('user.signed_up', [0, 2, 2]);

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?days=4')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.metric).toBe('signups');
    expect(res.body.from).toBe(isoDay(daysAgo(3)));
    expect(res.body.to).toBe(isoDay(daysAgo(0)));
    expect(res.body.points).toEqual([
      { date: isoDay(daysAgo(3)), count: 0 },
      { date: isoDay(daysAgo(2)), count: 2 },
      // The empty day is present as a zero rather than missing, so the line does
      // not join Monday to Wednesday as though Tuesday never happened.
      { date: isoDay(daysAgo(1)), count: 0 },
      { date: isoDay(daysAgo(0)), count: 1 },
    ]);
  });

  it('counts today in full, so the window ends today', async () => {
    const { token } = await account('admin');
    await events('user.logged_in', [0]);

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?metric=logins&days=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.points).toEqual([{ date: isoDay(daysAgo(0)), count: 1 }]);
  });

  it('ignores anything older than the window', async () => {
    const { token } = await account('admin');
    await events('professional.applied', [1, 30]);

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?metric=applications&days=7')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.points).toHaveLength(7);
    expect(
      res.body.points.reduce((total: number, point: { count: number }) => total + point.count, 0)
    ).toBe(1);
  });

  it('buckets the blogs line from the posts', async () => {
    const { token } = await account('admin');
    await post('published', 1);
    await post('hidden', 1);

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?metric=blogs&days=3')
      .set('Authorization', `Bearer ${token}`);

    // Every status counts: this line is writing that happened, and a post being
    // taken down later does not mean it was never written.
    expect(res.body.points).toEqual([
      { date: isoDay(daysAgo(2)), count: 0 },
      { date: isoDay(daysAgo(1)), count: 2 },
      { date: isoDay(daysAgo(0)), count: 0 },
    ]);
  });

  it('refuses a metric it does not plot', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?metric=refunds')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('refuses a window longer than events are kept', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?days=365')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('refuses a window of no days at all', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/metrics/timeseries?days=0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/admin/metrics/breakdown', () => {
  it('slices the accounts by role, biggest first', async () => {
    const { token } = await account('admin');
    await account();
    await account();
    await account('professional');

    const res = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=role')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.slices).toEqual([
      { label: 'user', count: 2 },
      // A tie falls back to the label, so the order is stable between reloads
      // rather than whatever the aggregation happened to return.
      { label: 'admin', count: 1 },
      { label: 'professional', count: 1 },
    ]);
  });

  it('slices the posts by status, leaving out the statuses nothing is in', async () => {
    const { token } = await account('admin');
    await post('published');
    await post('published');
    await post('removed');

    const res = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=blogStatus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.slices).toEqual([
      { label: 'published', count: 2 },
      { label: 'removed', count: 1 },
    ]);
    // No 'draft: 0' and no 'hidden: 0': an empty slice is a legend entry
    // pretending to be data.
    expect(res.body.slices).toHaveLength(2);
  });

  it('slices the applications by status', async () => {
    const { token } = await account('admin');
    await application('pending');
    await application('pending');
    await application('rejected');

    const res = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=professionalStatus')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.slices).toEqual([
      { label: 'pending', count: 2 },
      { label: 'rejected', count: 1 },
    ]);
  });

  it('refuses a dimension it cannot slice', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=petSpecies')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('refuses a request that names no dimension', async () => {
    const { token } = await account('admin');

    const res = await request(app)
      .get('/api/v1/admin/metrics/breakdown')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });
});

describe('metrics caching', () => {
  it('answers a repeated question from memory', async () => {
    const { token } = await account('admin');

    const first = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=role')
      .set('Authorization', `Bearer ${token}`);
    expect(first.body.total).toBe(1);

    await account();

    const second = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=role')
      .set('Authorization', `Bearer ${token}`);

    // Deliberate: a chart may be up to a minute behind. The pages that act on a
    // specific account read it fresh, so nothing decides anything on this number.
    expect(second.body.total).toBe(1);

    clearMetricsCache();

    const third = await request(app)
      .get('/api/v1/admin/metrics/breakdown?dimension=role')
      .set('Authorization', `Bearer ${token}`);

    expect(third.body.total).toBe(2);
  });

  it('keeps each question separate', async () => {
    const { token } = await account('admin');
    await events('user.signed_up', [0]);
    await events('user.logged_in', [0, 0]);

    const signups = await request(app)
      .get('/api/v1/admin/metrics/timeseries?metric=signups&days=1')
      .set('Authorization', `Bearer ${token}`);
    const logins = await request(app)
      .get('/api/v1/admin/metrics/timeseries?metric=logins&days=1')
      .set('Authorization', `Bearer ${token}`);

    // Two metrics, one window: a cache keyed on the window alone would serve the
    // signups line under the logins legend.
    expect(signups.body.points[0].count).toBe(1);
    expect(logins.body.points[0].count).toBe(2);
  });
});
