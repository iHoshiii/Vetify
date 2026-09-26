import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { replaceOsmClinicCache } from '../../../models/osm-clinics';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('GET /api/v1/clinics', () => {
  it('serves the persistent nationwide cache without requiring an account', async () => {
    await replaceOsmClinicCache([
      {
        id: 'node/42',
        name: 'Mabuhay Animal Clinic',
        latitude: 14.6,
        longitude: 121.05,
      },
    ]);

    const response = await request(app).get('/api/v1/clinics');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('stale-while-revalidate');
    expect(response.body).toMatchObject({
      stale: false,
      items: [{ id: 'node/42', name: 'Mabuhay Animal Clinic' }],
    });
  });
});
