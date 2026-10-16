import type { Server } from 'socket.io';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app';
import { insertUser, usersCollection } from '../../models/users';
import * as restrictions from '../../models/users/restrict-account';
import { setRealtime } from '../../realtime/hub';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { changeUserStatus } from '../user-moderation.service';

const app = createApp();
const credentials = { email: 'restored@example.com', password: 'Sup3rSecret!' };
beforeAll(startTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function cookie(response: request.Response) {
  return (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
}

describe('late restriction cleanup after reinstatement', () => {
  it.each(['suspended', 'deactivated'] as const)(
    'preserves a new sign-in after %s cleanup resumes',
    async (status) => {
      const user = await insertUser({ ...credentials, provider: 'local' });
      await usersCollection().updateOne({ _id: user._id }, { $set: { emailVerified: true } });
      const moderator = await insertUser({
        email: 'moderator@example.com',
        provider: 'google',
        role: 'admin',
      });
      const oldLogin = await request(app).post('/api/v1/auth/login').send(credentials);
      const persisted = gate();
      const resume = gate();
      const originalRestrict = restrictions.restrictAccount;
      vi.spyOn(restrictions, 'restrictAccount').mockImplementation(async (id, patch) => {
        const restricted = await originalRestrict(id, patch);
        persisted.resolve();
        await resume.promise;
        return restricted;
      });
      const pending =
        status === 'suspended'
          ? changeUserStatus({
              id: user._id,
              moderator,
              to: status,
              reason: 'Temporary restriction',
            })
          : request(app)
              .post('/api/v1/account/deactivate')
              .set('Authorization', `Bearer ${oldLogin.body.accessToken}`)
              .send({ confirmation: 'DEACTIVATE', currentPassword: credentials.password })
              .then((response) => response);
      await persisted.promise;
      await changeUserStatus({ id: user._id, moderator, to: 'active' });
      const freshLogin = await request(app).post('/api/v1/auth/login').send(credentials);
      expect(freshLogin.status).toBe(200);
      const oldSocket = {
        data: { userId: user._id.toString(), sessionVersion: 0 },
        emit: vi.fn(),
        disconnect: vi.fn(),
      };
      const freshSocket = {
        data: { userId: user._id.toString(), sessionVersion: 1 },
        emit: vi.fn(),
        disconnect: vi.fn(),
      };
      const sockets = new Map([
        ['old', oldSocket],
        ['fresh', freshSocket],
      ]);
      setRealtime({
        sockets: { sockets },
        in: () => ({
          emit: vi.fn(),
          disconnectSockets: () => {
            oldSocket.disconnect(true);
            freshSocket.disconnect(true);
          },
        }),
      } as unknown as Server);
      resume.resolve();
      await pending;
      expect(oldSocket.disconnect).toHaveBeenCalledWith(true);
      expect(freshSocket.disconnect).not.toHaveBeenCalled();
      expect(
        (
          await request(app)
            .get('/api/v1/account/preferences')
            .set('Authorization', `Bearer ${oldLogin.body.accessToken}`)
        ).status
      ).toBe(401);
      expect(
        (
          await request(app)
            .get('/api/v1/account/preferences')
            .set('Authorization', `Bearer ${freshLogin.body.accessToken}`)
        ).status
      ).toBe(200);
      expect(
        (await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie(oldLogin))).status
      ).toBe(401);
      expect(
        (await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie(freshLogin))).status
      ).toBe(200);
    }
  );
});
