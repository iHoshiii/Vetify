import { MESSAGE_ACTION_WINDOW_MS } from '@shared/limits';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import {
  insertProfessional,
  insertUser,
  messagesCollection,
  updateProfessional,
} from '../../../models';
import { signAccessToken } from '../../../services/auth.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();
let sequence = 0;

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function account() {
  sequence += 1;
  const user = await insertUser({
    email: `actions${sequence}@example.com`,
    password: 'Sup3rSecret!',
    name: `Pat ${sequence}`,
    provider: 'local',
  });
  return {
    user,
    token: signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' }),
  };
}

async function conversation() {
  const client = await account();
  const vet = await account();
  sequence += 1;
  const filed = await insertProfessional({
    user: vet.user._id,
    fullName: `Reyes ${sequence}`,
    licenseNumber: `PRC-ACTION-${sequence}`,
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
  const professional = await updateProfessional(filed._id, { status: 'verified' });
  const opened = await request(app)
    .post('/api/v1/messages')
    .set('Authorization', `Bearer ${client.token}`)
    .send({ professionalId: professional?._id.toString() });
  const sent = await request(app)
    .post(`/api/v1/messages/${opened.body.thread.id}/messages`)
    .set('Authorization', `Bearer ${client.token}`)
    .send({ body: 'Original text' });
  return {
    client,
    vet,
    threadId: opened.body.thread.id as string,
    messageId: sent.body.message.id as string,
  };
}

describe('message edit and unsend', () => {
  it('edits an owned message and updates the latest thread preview', async () => {
    const { client, vet, threadId, messageId } = await conversation();
    const edited = await request(app)
      .patch(`/api/v1/messages/${threadId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ body: 'Updated text' });

    expect(edited.status).toBe(200);
    expect(edited.body.message).toMatchObject({
      body: 'Updated text',
      editedAt: expect.any(String),
    });
    const incoming = await request(app)
      .get('/api/v1/messages/incoming')
      .set('Authorization', `Bearer ${vet.token}`);
    expect(incoming.body.items[0].lastBody).toBe('Updated text');
  });

  it('unsends for both people, leaves a placeholder preview, and removes unread credit', async () => {
    const { client, vet, threadId, messageId } = await conversation();
    const removed = await request(app)
      .delete(`/api/v1/messages/${threadId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${client.token}`);

    expect(removed.status).toBe(200);
    expect(removed.body.message).toMatchObject({ body: '', unsentAt: expect.any(String) });
    const unread = await request(app)
      .get('/api/v1/messages/unread')
      .set('Authorization', `Bearer ${vet.token}`);
    expect(unread.body.unread).toBe(0);
    const incoming = await request(app)
      .get('/api/v1/messages/incoming')
      .set('Authorization', `Bearer ${vet.token}`);
    expect(incoming.body.items[0].lastBody).toBe('Message was unsent');
  });

  it('rejects editing by the recipient and editing after the action window', async () => {
    const { client, vet, threadId, messageId } = await conversation();
    const other = await request(app)
      .patch(`/api/v1/messages/${threadId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${vet.token}`)
      .send({ body: 'Changed by recipient' });
    expect(other.status).toBe(404);

    await messagesCollection().updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { createdAt: new Date(Date.now() - MESSAGE_ACTION_WINDOW_MS - 1) } }
    );
    const expired = await request(app)
      .patch(`/api/v1/messages/${threadId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${client.token}`)
      .send({ body: 'Too late' });
    expect(expired.status).toBe(409);
  });

  it('allows an old owned message to be unsent', async () => {
    const { client, threadId, messageId } = await conversation();
    await messagesCollection().updateOne(
      { _id: new ObjectId(messageId) },
      { $set: { createdAt: new Date(Date.now() - MESSAGE_ACTION_WINDOW_MS - 1) } }
    );
    const removed = await request(app)
      .delete(`/api/v1/messages/${threadId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${client.token}`);
    expect(removed.status).toBe(200);
    expect(removed.body.message.unsentAt).toEqual(expect.any(String));
  });

  it('removes a received message only for the requesting participant', async () => {
    const { client, vet, threadId, messageId } = await conversation();
    const removed = await request(app)
      .delete(`/api/v1/messages/${threadId}/messages/${messageId}`)
      .set('Authorization', `Bearer ${vet.token}`);
    expect(removed.body).toMatchObject({ message: null, removedForYou: true });

    const [recipientView, senderView] = await Promise.all([
      request(app)
        .get(`/api/v1/messages/${threadId}/messages`)
        .set('Authorization', `Bearer ${vet.token}`),
      request(app)
        .get(`/api/v1/messages/${threadId}/messages`)
        .set('Authorization', `Bearer ${client.token}`),
    ]);
    expect(recipientView.body.items).toHaveLength(0);
    expect(senderView.body.items).toHaveLength(1);
  });
});
