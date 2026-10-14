import request from 'supertest';
import { ObjectId } from 'mongodb';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { insertThread } from '../../../models/messages';
import { insertUser } from '../../../models/users';
import { createNotification, markRead, countUnread } from '../../../services/notifications.service';
import { syncThreadPresence } from '../../presence';
import { withRealtimeWork } from '../work';
import { setupGateway, callBooking, connect, tokenFor, event, received, send } from './fixtures';

setupGateway();
const endpoint = env.REALTIME_MANAGEMENT_ENDPOINT;
beforeEach(() => {
  env.REALTIME_MANAGEMENT_ENDPOINT = 'https://gateway.test/prod';
});
afterEach(() => {
  env.REALTIME_MANAGEMENT_ENDPOINT = endpoint;
});
const app = createApp();
async function conversation() {
  const { owner, vet } = await callBooking();
  const thread = await insertThread({
    client: owner._id,
    professionalUser: vet._id,
    professional: new ObjectId(),
  });
  const [a, b] = await Promise.all([connect(owner), connect(vet)]);
  send.mockClear();
  return { owner, vet, thread, a, b };
}

it('keeps persisted messages, both-tab updates and read receipts in the existing HTTP flow', async () => {
  const { owner, vet, thread, a, b } = await conversation();
  const path = `/api/v1/messages/${thread._id}/messages`;
  const sent = await withRealtimeWork(
    async () =>
      await request(app)
        .post(path)
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .send({ body: 'Hello' })
  );
  expect(sent.status).toBe(201);
  expect(received(a, 'thread:message')).toHaveLength(1);
  expect(received(b, 'thread:message')).toHaveLength(1);
  const read = await withRealtimeWork(
    async () =>
      await request(app)
        .get(path)
        .set('Authorization', `Bearer ${tokenFor(vet)}`)
  );
  expect(read.status).toBe(200);
  expect(JSON.stringify(read.body)).toContain('Hello');
  expect(received(a, 'thread:read')).toHaveLength(1);
  expect(received(a, 'thread:read')[0][1]).toMatchObject({
    payload: { threadId: String(thread._id) },
  });
});

it('relays typing only to the other participant and supports the HTTP fallback', async () => {
  const { owner, thread, a, b } = await conversation();
  const outsider = await insertUser({ email: 'outsider@test.invalid', provider: 'google' });
  const stranger = await connect(outsider);
  send.mockClear();
  const payload = { threadId: String(thread._id), typing: true };
  await event(a, 'thread:typing', payload);
  expect(received(b, 'thread:typing')[0][1]).toMatchObject({ payload });
  expect(received(a, 'thread:typing')).toHaveLength(0);
  await event(stranger, 'thread:typing', payload);
  expect(received(b, 'thread:typing')).toHaveLength(1);
  const fallback = await withRealtimeWork(
    async () =>
      await request(app)
        .post(`/api/v1/messages/${thread._id}/typing`)
        .set('Authorization', `Bearer ${tokenFor(owner)}`)
        .send({ typing: false })
  );
  expect(fallback.status).toBe(200);
  expect(received(b, 'thread:typing').at(-1)![1]).toMatchObject({ payload: { typing: false } });
});

it('retains private notification delivery to every recipient tab and persists read status', async () => {
  const { owner, a, b } = await conversation();
  const second = await connect(owner);
  send.mockClear();
  const notification = await withRealtimeWork(() =>
    createNotification({
      user: owner._id,
      appointment: new ObjectId(),
      kind: 'booking_confirmed',
      title: 'Confirmed',
      body: 'Your appointment is confirmed.',
    })
  );
  expect(notification).not.toBeNull();
  expect(received(a, 'notification:new')).toHaveLength(1);
  expect(received(second, 'notification:new')).toHaveLength(1);
  expect(received(b, 'notification:new')).toHaveLength(0);
  await withRealtimeWork(() => markRead(notification!.id, owner._id));
  expect(await countUnread(owner._id)).toBe(0);
});

it('refreshes mutual presence for a conversation created while both users are already online', async () => {
  const { owner, vet, thread, a, b } = await conversation();
  await withRealtimeWork(async () => {
    syncThreadPresence(thread);
  });
  expect(received(a, 'presence:changed')[0][1]).toMatchObject({
    payload: { userId: String(vet._id), online: true },
  });
  expect(received(b, 'presence:changed')[0][1]).toMatchObject({
    payload: { userId: String(owner._id), online: true },
  });
});
