import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { insertUser, updateUser, usersCollection } from '../../models/users';
import { changeUserStatus } from '../../services/user-moderation.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { disconnectUserSessions } from '../hub';
import { canJoinCall } from '../call-window';
import {
  callBooking,
  connected,
  emitAck,
  event,
  startSockets,
  stopSockets,
} from './socket-fixtures';

beforeAll(startTestDb);
beforeEach(startSockets);
afterEach(async () => {
  await stopSockets();
  await clearTestDb();
});
afterAll(stopTestDb);

describe('existing call access', () => {
  it('suspends a connected participant and tells the peer they left', async () => {
    const { owner, vet, id } = await callBooking();
    const admin = await insertUser({
      email: 'admin@test.invalid',
      provider: 'google',
      role: 'admin',
    });
    const ownerSocket = await connected(owner);
    const vetSocket = await connected(vet);
    expect(await emitAck(ownerSocket, 'call:join', { appointmentId: id })).toMatchObject({
      ok: true,
    });
    expect(await emitAck(vetSocket, 'call:join', { appointmentId: id })).toMatchObject({
      ok: true,
    });
    const ended = event(ownerSocket, 'session:ended');
    const disconnected = event(ownerSocket, 'disconnect');
    const left = event(vetSocket, 'call:peer-left');
    await changeUserStatus({
      id: owner._id,
      moderator: admin,
      to: 'suspended',
      reason: 'Test restriction',
    });
    await Promise.all([ended, disconnected, left]);
    expect(ownerSocket.connected).toBe(false);
    expect(await canJoinCall(owner._id.toString(), id)).toBe(false);
  });

  it('ends old connections after a password reset without ending a newer sign-in', async () => {
    const { owner } = await callBooking();
    const old = await connected(owner);
    await usersCollection().updateOne({ _id: owner._id }, { $inc: { sessionVersion: 1 } });
    const fresh = await connected({ ...owner, sessionVersion: 1 });
    const disconnected = event(old, 'disconnect');
    disconnectUserSessions(owner._id.toString(), 1);
    await disconnected;
    expect(fresh.connected).toBe(true);
  });

  it('does not grant call access to a deactivated participant', async () => {
    const { owner, id } = await callBooking();
    await updateUser(owner._id, { status: 'deactivated' });
    expect(await canJoinCall(owner._id.toString(), id)).toBe(false);
  });
});
