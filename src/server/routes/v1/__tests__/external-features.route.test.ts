import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { getDb } from '../../../config/db';
import { insertUser } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
beforeAll(startTestDb, 120_000);
afterAll(stopTestDb);

describe('extracted feature boundary', () => {
  it.each(['/blogs', '/blogs/pet-care'])('no longer serves the Blog API at %s', async (path) => {
    const response = await request(app).get(`/api/v1${path}`);
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('removes Blog administration and leaves main metrics independent of Blog data', async () => {
    const user = await insertUser({
      email: 'extraction-admin@example.test',
      password: 'Sup3rSecret!',
      provider: 'local',
      role: 'admin',
      emailVerified: true,
    });
    const token = signAccessToken({ sub: user._id.toString(), email: user.email, role: 'admin' });
    const authorization = `Bearer ${token}`;
    await request(app).get('/api/v1/admin/blogs').set('Authorization', authorization).expect(404);
    const metrics = await request(app)
      .get('/api/v1/admin/metrics/overview')
      .set('Authorization', authorization)
      .expect(200);
    expect(metrics.body.totals).not.toHaveProperty('blogs');
    expect(metrics.body.trend).not.toHaveProperty('blogs');
    const names = (await getDb().listCollections().toArray()).map(({ name }) => name);
    expect(names).not.toContain('blogs');
  });

  it.each(['/books', '/books/mine', '/books/affiliate', '/books/example/download'])(
    'no longer serves the Books API at %s',
    async (path) => {
      const response = await request(app).get(`/api/v1${path}`);
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    }
  );

  it('does not initialize Books collections while initializing main', async () => {
    const names = (await getDb().listCollections().toArray()).map(({ name }) => name);
    expect(names).not.toContain('books');
    expect(names).not.toContain('book_download_quotas');
    expect(names).toEqual(expect.arrayContaining(['users', 'appointments', 'professionals']));
  });

  it.each(['/pets', '/meal-plans', '/nutrition-observations'])(
    'no longer mounts mobile Planner data at %s',
    async (path) => {
      const response = await request(app).get(`/api/v1${path}`);
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    }
  );

  it('keeps mobile Planner collections out of main startup', async () => {
    const names = (await getDb().listCollections().toArray()).map(({ name }) => name);
    for (const name of ['pets', 'meal_plans', 'feeding_logs', 'nutrition_observations']) {
      expect(names).not.toContain(name);
    }
  });

  it('preserves the main health API', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
