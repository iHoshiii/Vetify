import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { findUserById, insertUser } from '../../../models';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let sequence = 0;
async function account() {
  sequence += 1;
  const user = await insertUser({
    email: `settings${sequence}@example.com`,
    password: 'Sup3rSecret!',
    name: `Settings ${sequence}`,
    provider: 'local',
  });
  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role }),
  };
}

describe('customer account settings routes', () => {
  it('reads and updates notification and region preferences', async () => {
    const owner = await account();
    const update = await request(app)
      .patch('/api/v1/account/preferences')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        notifications: {
          enabled: true,
          categories: { bookings: false, reminders: true, reviews: false },
          dnd: { enabled: true, start: '21:30', end: '06:30' },
        },
        region: { timeZone: 'Asia/Tokyo' },
      });

    expect(update.status).toBe(200);
    expect(update.body.preferences.region.timeZone).toBe('Asia/Tokyo');
    expect(update.body.preferences.notifications.categories.bookings).toBe(false);
    expect(update.body.preferences.privacy).toEqual({ blockedUserIds: [] });
  });

  it('blocks and unblocks another account', async () => {
    const owner = await account();
    const other = await account();
    const path = `/api/v1/account/blocked/${other.user._id}`;

    expect(
      (await request(app).post(path).set('Authorization', `Bearer ${owner.token}`)).status
    ).toBe(200);
    const list = await request(app)
      .get('/api/v1/account/blocked')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(list.body.blocked.map((user: { id: string }) => user.id)).toContain(
      other.user._id.toString()
    );
    expect(
      (await request(app).delete(path).set('Authorization', `Bearer ${owner.token}`)).status
    ).toBe(200);
  });

  it('exports the account and its preferences', async () => {
    const owner = await account();
    const response = await request(app)
      .get('/api/v1/account/export')
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.body.account.email).toBe(owner.user.email);
    expect(response.body.preferences.region.timeZone).toBe('Asia/Manila');
    expect(response.body.exportedAt).toBeTruthy();
  });

  it('requires the password and deactivates the account', async () => {
    const owner = await account();
    const denied = await request(app)
      .post('/api/v1/account/deactivate')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ confirmation: 'DEACTIVATE', currentPassword: 'wrong-password' });
    expect(denied.status).toBe(400);

    const response = await request(app)
      .post('/api/v1/account/deactivate')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ confirmation: 'DEACTIVATE', currentPassword: 'Sup3rSecret!' });
    expect(response.status).toBe(200);
    expect((await findUserById(owner.user._id))?.status).toBe('deactivated');
  });
});
