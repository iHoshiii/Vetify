import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { insertProfessional, insertUser, updateProfessional } from '../../../models';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

async function account() {
  seq += 1;
  const user = await insertUser({
    email: `chat${seq}@example.com`,
    password: 'Sup3rSecret!',
    name: `Pat ${seq}`,
    provider: 'local',
  });
  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' }),
  };
}

// A verified vet, returned with the token for its own account so the incoming side can be tested.
async function vet() {
  const owner = await account();
  seq += 1;
  const filed = await insertProfessional({
    user: owner.user._id,
    fullName: `Reyes ${seq}`,
    licenseNumber: `PRC-${900000 + seq}`,
    licenseAuthority: 'Professional Regulation Commission',
    clinicName: 'Bayside Animal Clinic',
    addresses: [
      {
        kind: 'clinic',
        line1: '12 Mabini',
        city: 'Cebu',
        province: 'Cebu',
        postalCode: '6000',
        fix: null,
      },
    ],
    bio: 'Small animal practice.',
    yearsExperience: 15,
    backgroundCheckConsent: true,
  });
  const application = await updateProfessional(filed._id, { status: 'verified' });
  return { ...owner, application: application! };
}

describe('POST /api/v1/messages', () => {
  it('opens a thread with a verified vet and returns it', async () => {
    const client = await account();
    const doc = await vet();

    const res = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ professionalId: doc.application._id.toString() });

    expect(res.status).toBe(201);
    expect(res.body.thread.professionalId).toBe(doc.application._id.toString());
    // The far side is named by the vet's licence name, not the raw account behind it.
    expect(res.body.thread.with.name).toBe(doc.application.fullName);
  });

  it('401s an anonymous caller', async () => {
    const doc = await vet();
    const res = await request(app)
      .post('/api/v1/messages')
      .send({ professionalId: doc.application._id.toString() });
    expect(res.status).toBe(401);
  });

  it('404s a professional id that is not in the directory', async () => {
    const client = await account();
    const res = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ professionalId: new ObjectId().toString() });
    expect(res.status).toBe(404);
  });
});

describe('a thread end to end', () => {
  it('sends, lists on both sides, and counts unread for the recipient', async () => {
    const client = await account();
    const doc = await vet();

    const opened = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ professionalId: doc.application._id.toString() });
    const threadId = opened.body.thread.id;

    const sent = await request(app)
      .post(`/api/v1/messages/${threadId}/messages`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ body: 'Is Monday free?' });
    expect(sent.status).toBe(201);

    // The vet sees it on the incoming side with one unread.
    const incoming = await request(app)
      .get('/api/v1/messages/incoming')
      .set('Authorization', `Bearer ${doc.token}`);
    expect(incoming.body.items).toHaveLength(1);
    expect(incoming.body.items[0].unread).toBe(1);

    const unread = await request(app)
      .get('/api/v1/messages/unread')
      .set('Authorization', `Bearer ${doc.token}`);
    expect(unread.body.unread).toBe(1);

    const incomingUnread = await request(app)
      .get('/api/v1/messages/unread?side=incoming')
      .set('Authorization', `Bearer ${doc.token}`);
    expect(incomingUnread.body.unread).toBe(1);

    const personalUnread = await request(app)
      .get('/api/v1/messages/unread?side=mine')
      .set('Authorization', `Bearer ${doc.token}`);
    expect(personalUnread.body.unread).toBe(0);

    // Reading the page clears the vet's unread and shows the message oldest-first.
    const page = await request(app)
      .get(`/api/v1/messages/${threadId}/messages`)
      .set('Authorization', `Bearer ${doc.token}`);
    expect(page.body.items[0].body).toBe('Is Monday free?');
    expect(page.body.items[0].fromYou).toBe(false);

    const after = await request(app)
      .get('/api/v1/messages/unread')
      .set('Authorization', `Bearer ${doc.token}`);
    expect(after.body.unread).toBe(0);
  });

  it('404s a caller who is not part of the thread', async () => {
    const client = await account();
    const doc = await vet();
    const outsider = await account();

    const opened = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ professionalId: doc.application._id.toString() });

    const res = await request(app)
      .get(`/api/v1/messages/${opened.body.thread.id}/messages`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/messages/:id/state', () => {
  it('files a thread on a shelf and drops it from the active list', async () => {
    const client = await account();
    const doc = await vet();

    const opened = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ professionalId: doc.application._id.toString() });
    const threadId = opened.body.thread.id;

    const filed = await request(app)
      .patch(`/api/v1/messages/${threadId}/state`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ state: 'archived' });
    expect(filed.status).toBe(200);

    const active = await request(app)
      .get('/api/v1/messages/mine')
      .set('Authorization', `Bearer ${client.token}`);
    expect(active.body.items).toHaveLength(0);

    const archived = await request(app)
      .get('/api/v1/messages/mine?state=archived')
      .set('Authorization', `Bearer ${client.token}`);
    expect(archived.body.items).toHaveLength(1);
  });

  it('400s an unknown state', async () => {
    const client = await account();
    const doc = await vet();
    const opened = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${client.token}`)
      .send({ professionalId: doc.application._id.toString() });

    const res = await request(app)
      .patch(`/api/v1/messages/${opened.body.thread.id}/state`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ state: 'burned' });
    expect(res.status).toBe(400);
  });
});
