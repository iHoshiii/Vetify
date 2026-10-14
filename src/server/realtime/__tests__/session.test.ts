import jwt from 'jsonwebtoken';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../config/env';
import { insertUser, updateUser, usersCollection } from '../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  connected,
  emitAck,
  event,
  openSocket,
  serverSocket,
  startSockets,
  stopSockets,
  tokenFor,
} from './socket-fixtures';

beforeAll(startTestDb);
beforeEach(startSockets);
afterEach(async () => {
  await stopSockets();
  await clearTestDb();
});
afterAll(stopTestDb);

describe('socket admission and renewal', () => {
  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'refuses a %s account with a valid token',
    async (status) => {
      const user = await insertUser({ email: 'restricted@test.invalid', provider: 'google' });
      await updateUser(user._id, { status });
      const socket = openSocket(tokenFor(user));
      const error = await event<Error>(socket, 'connect_error');
      expect(error.message).toBe('unauthorized');
      expect(socket.connected).toBe(false);
    }
  );

  it('refuses expired and old-version credentials', async () => {
    const user = await insertUser({ email: 'stale@test.invalid', provider: 'google' });
    const expired = jwt.sign({ sub: user._id.toString() }, env.JWT_SECRET_ACCESS, {
      expiresIn: -1,
    });
    expect((await event<Error>(openSocket(expired), 'connect_error')).message).toBe('unauthorized');
    const oldToken = tokenFor(user);
    await usersCollection().updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    expect((await event<Error>(openSocket(oldToken), 'connect_error')).message).toBe(
      'unauthorized'
    );
  });

  it('keeps the same connection while accepting fresh credentials for that account', async () => {
    const user = await insertUser({ email: 'renew@test.invalid', provider: 'google' });
    const socket = await connected(user);
    const id = socket.id;
    const result = await emitAck<{ ok: boolean }>(socket, 'session:renew', {
      token: tokenFor(user),
    });
    expect(result.ok).toBe(true);
    expect(socket.id).toBe(id);
    expect(socket.connected).toBe(true);
  });

  it('refuses to switch account identity inside an existing connection', async () => {
    const user = await insertUser({ email: 'first@test.invalid', provider: 'google' });
    const other = await insertUser({ email: 'other@test.invalid', provider: 'google' });
    const socket = await connected(user);
    expect(await emitAck(socket, 'session:renew', { token: tokenFor(other) })).toEqual({
      ok: false,
    });
  });

  it('does not shorten a renewed session when an older reply arrives later', async () => {
    const user = await insertUser({ email: 'ordered@test.invalid', provider: 'google' });
    const socket = await connected(user);
    const claims = { sub: user._id.toString(), sessionVersion: 0 };
    const newer = jwt.sign(claims, env.JWT_SECRET_ACCESS, { expiresIn: '30m' });
    const older = jwt.sign(claims, env.JWT_SECRET_ACCESS, { expiresIn: '20m' });
    expect(await emitAck(socket, 'session:renew', { token: newer })).toEqual({ ok: true });
    const expiry = serverSocket(socket).data.expiresAt;
    expect(await emitAck(socket, 'session:renew', { token: older })).toEqual({ ok: true });
    expect(serverSocket(socket).data.expiresAt).toBe(expiry);
  });

  it('reports normal expiry correctly when a packet reaches the guard before its timer', async () => {
    const user = await insertUser({ email: 'expiry@test.invalid', provider: 'google' });
    const socket = await connected(user);
    serverSocket(socket).data.expiresAt = Date.now() - 1;
    const ended = event<{ reason: string }>(socket, 'session:ended');
    socket.emit('thread:typing', { threadId: user._id.toString(), typing: true });
    expect(await ended).toEqual({ reason: 'expired' });
  });

  it('ends a connection whose account becomes restricted before its next event', async () => {
    const user = await insertUser({ email: 'changed@test.invalid', provider: 'google' });
    const socket = await connected(user);
    await updateUser(user._id, { status: 'banned' });
    const ended = event(socket, 'session:ended');
    const disconnected = event(socket, 'disconnect');
    socket.emit('thread:typing', { threadId: user._id.toString(), typing: true });
    await ended;
    await disconnected;
    expect(socket.connected).toBe(false);
  });
});
