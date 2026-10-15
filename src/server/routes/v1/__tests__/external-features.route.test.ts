import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { getDb } from '../../../config/db';
import { startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
beforeAll(startTestDb, 120_000);
afterAll(stopTestDb);

describe('extracted feature boundary', () => {
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

  it('preserves the main health API', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
