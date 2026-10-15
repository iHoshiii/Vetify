import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { getDb } from '../../../config/db';
import { insertUser, usersCollection } from '../../../models/users';
import { socketSession } from '../../session';
import { issueTicket } from '../tickets';
import { connections } from '../store';
import { handleGateway } from '../handler';
import { setupGateway, connect, event, frame, send, close, stored, tokenFor } from './fixtures';

setupGateway();
describe('gateway admission and session security', () => {
  it('issues opaque, hashed tickets only to verified browser sessions', async () => {
    const app = createApp();
    expect(
      (await request(app).post('/api/v1/account/realtime-ticket').send({ clientId: randomUUID() }))
        .status
    ).toBe(401);
    const user = await insertUser({ email: 'user@test.invalid', provider: 'google' });
    const reply = await request(app)
      .post('/api/v1/account/realtime-ticket')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ clientId: randomUUID() });
    expect(reply.status).toBe(200);
    expect(reply.body.ticket).toMatch(/^[a-f0-9]{64}$/);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(await getDb().collection('realtimetickets').findOne())).not.toContain(
      reply.body.ticket
    );
    const native = jwt.sign(
      { sub: user._id.toString(), nativeSessionId: 'native' },
      env.JWT_SECRET_ACCESS,
      { expiresIn: 60 }
    );
    await expect(socketSession(native)).rejects.toThrow('unauthorized');
    const local = await insertUser({
      email: 'local@test.invalid',
      provider: 'local',
      password: 'Sup3rSecret!',
    });
    await expect(socketSession(tokenFor(local))).rejects.toThrow('Confirm your email');
  });
  it('rejects origins, reused and expired tickets without posting during connect', async () => {
    const user = await insertUser({ email: 'origin@test.invalid', provider: 'google' });
    const ticket = await issueTicket(await socketSession(tokenFor(user)), randomUUID());
    const input = {
      requestContext: { routeKey: '$connect', connectionId: 'id' },
      queryStringParameters: { ticket },
      headers: { Origin: 'https://other.invalid' },
    };
    expect((await handleGateway(input)).statusCode).toBe(403);
    input.headers.Origin = env.CLIENT_ORIGIN;
    expect((await handleGateway(input)).statusCode).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect((await handleGateway(input)).statusCode).toBe(401);
    const expired = await issueTicket(await socketSession(tokenFor(user)), randomUUID());
    await getDb()
      .collection('realtimetickets')
      .updateMany({}, { $set: { expiresOn: new Date(0) } });
    expect(
      (await handleGateway({ ...input, queryStringParameters: { ticket: expired } })).statusCode
    ).toBe(401);
  });
  it('checks account restrictions and revoked credentials on every event', async () => {
    const user = await insertUser({ email: 'revoke@test.invalid', provider: 'google' });
    const id = await connect(user);
    await usersCollection().updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    expect((await handleGateway(frame(id, 'connection:heartbeat'))).statusCode).toBe(401);
    expect(close).toHaveBeenCalledWith(id);
    expect(await stored(id)).toBeNull();
    await expect(socketSession(tokenFor(user))).rejects.toThrow();
  });
  it('cannot switch account during renewal or extend an expired session', async () => {
    const first = await insertUser({ email: 'first@test.invalid', provider: 'google' });
    const second = await insertUser({ email: 'second@test.invalid', provider: 'google' });
    const id = await connect(first);
    expect((await event(id, 'session:renew', { token: tokenFor(second) }))?.payload?.ok).toBe(
      false
    );
    expect((await stored(id))?.userId).toBe(first._id.toString());
    expect((await event(id, 'session:renew', { token: tokenFor(first) }))?.payload?.ok).toBe(true);
    await connections().updateOne({ _id: id }, { $set: { expiresAt: Date.now() - 1 } });
    expect((await handleGateway(frame(id, 'connection:heartbeat'))).statusCode).toBe(401);
  });
  it('bounds message size, malformed messages and shared event rate limits', async () => {
    const user = await insertUser({ email: 'limits@test.invalid', provider: 'google' });
    const id = await connect(user);
    expect((await handleGateway({ ...frame(id, 'bad'), body: '{' })).statusCode).toBe(400);
    expect((await handleGateway(frame(id, 'bad', 'x'.repeat(30_000)))).statusCode).toBe(400);
    await connections().updateOne(
      { _id: id },
      { $set: { window: Math.floor(Date.now() / 60_000), received: 180 } }
    );
    expect((await handleGateway(frame(id, 'connection:heartbeat'))).statusCode).toBe(429);
  });
});
