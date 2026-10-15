import { ObjectId } from 'mongodb';
import { expect, it } from 'vitest';
import { insertThread } from '../../../models/messages';
import { closeUser, sendUser } from '../delivery';
import { handleGateway } from '../handler';
import { connections, memberships, touchConnection } from '../store';
import {
  setupGateway,
  connect,
  event,
  frame,
  callBooking,
  received,
  send,
  close,
} from './fixtures';

setupGateway();
async function participants() {
  const booking = await callBooking();
  await insertThread({
    client: booking.owner._id,
    professionalUser: booking.vet._id,
    professional: new ObjectId(),
  });
  const [owner, vet] = await Promise.all([connect(booking.owner), connect(booking.vet)]);
  send.mockClear();
  return { ...booking, a: owner, b: vet };
}

it('announces offline exactly once when delivery discovers a gone connection', async () => {
  const { owner, a, b } = await participants();
  send.mockImplementation(async (id) => id !== a);
  await sendUser(owner._id.toString(), 'notification:new', {});
  await handleGateway({ requestContext: { routeKey: '$disconnect', connectionId: a } });
  expect(received(b, 'presence:changed')).toHaveLength(1);
  expect(received(b, 'presence:changed')[0][1]).toMatchObject({ payload: { online: false } });
});

it('announces offline when the user is forcibly signed out', async () => {
  const { owner, b } = await participants();
  await closeUser(owner._id.toString());
  expect(received(b, 'presence:changed')).toHaveLength(1);
  expect(received(b, 'presence:changed')[0][1]).toMatchObject({ payload: { online: false } });
});

it('keeps presence online when another tab remains connected', async () => {
  const { owner, a, b } = await participants();
  await connect(owner);
  send.mockClear();
  send.mockImplementation(async (id) => id !== a);
  await sendUser(owner._id.toString(), 'notification:new', {});
  expect(received(b, 'presence:changed')[0][1]).toMatchObject({ payload: { online: true } });
});

it('reconnects an expired heartbeat lease instead of silently losing the call membership', async () => {
  const { a, b, id } = await participants();
  await event(a, 'call:join', { appointmentId: id });
  await event(b, 'call:join', { appointmentId: id });
  const expired = new Date(Date.now() - 1000);
  await connections().updateOne({ _id: a }, { $set: { leaseUntil: expired } });
  await memberships().updateOne({ connectionId: a }, { $set: { leaseUntil: expired } });
  send.mockClear();
  expect((await handleGateway(frame(a, 'connection:heartbeat'))).statusCode).toBe(410);
  expect(close).toHaveBeenCalledWith(a);
  expect(await connections().findOne({ _id: a })).toBeNull();
  expect(received(b, 'call:peer-left')).toHaveLength(1);
  expect(received(a, 'session:ended')).toHaveLength(0);
});

it('closes unregistered sockets so the browser can reconnect', async () => {
  expect((await handleGateway(frame('missing', 'connection:heartbeat'))).statusCode).toBe(410);
  expect(close).toHaveBeenCalledWith('missing');
});

it('never shortens a renewed session when heartbeats run concurrently', async () => {
  const { a } = await participants();
  const before = (await connections().findOne({ _id: a }))!;
  const session = {
    userId: before.userId,
    sessionVersion: before.sessionVersion,
    expiresAt: before.expiresAt + 60_000,
  };
  await Promise.all([
    touchConnection(a, session),
    ...Array.from({ length: 8 }, () => touchConnection(a)),
  ]);
  const after = (await connections().findOne({ _id: a }))!;
  expect(after.expiresAt).toBe(session.expiresAt);
  expect(after.expiresOn.getTime()).toBe(session.expiresAt);
});
