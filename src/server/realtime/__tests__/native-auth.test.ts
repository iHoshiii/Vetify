import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io as connect } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { insertUser } from '../../models/users';
import { createAuthPayloadFor } from '../../services/auth.service';
import { createNativeSession, logoutNativeSession } from '../../services/native-session.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { attachRealtime } from '../socket';

const http = createServer(createApp());
const realtime = attachRealtime(http);
let origin: string;
beforeAll(async () => {
  await startTestDb();
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
}, 120_000);
afterEach(clearTestDb);
afterAll(async () => {
  await new Promise<void>((resolve) => realtime.close(() => resolve()));
  await stopTestDb();
});

function connectionResult(token: string): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect(origin, { auth: { token }, reconnection: false });
    socket.once('connect', () => {
      socket.disconnect();
      resolve('connected');
    });
    socket.once('connect_error', (error: Error) => {
      socket.disconnect();
      resolve(error.message);
    });
  });
}

describe('Mobile access credentials on main system realtime', () => {
  it('rejects planner session tokens before and after logout', async () => {
    const user = await insertUser({
      emailVerified: true,
      email: 'native@example.com',
      password: 'Sup3rSecret!',
      provider: 'local',
      name: 'Native',
    });
    const session = await createNativeSession(user);
    expect(await connectionResult(session.accessToken)).toBe('unauthorized');
    await logoutNativeSession(session.refreshToken);
    expect(await connectionResult(session.accessToken)).toBe('unauthorized');
  });

  it('still allows the main browser access token', async () => {
    const user = await insertUser({
      emailVerified: true,
      email: 'browser@example.com',
      password: 'Sup3rSecret!',
      provider: 'local',
      name: 'Browser',
    });
    const session = await createAuthPayloadFor(user);
    expect(await connectionResult(session.accessToken)).toBe('connected');
  });

  it('requires a local email to be verified before opening a browser socket', async () => {
    const user = await insertUser({
      email: 'pending@example.com',
      password: 'Sup3rSecret!',
      provider: 'local',
      emailVerified: false,
    });
    const session = await createAuthPayloadFor(user);
    expect(await connectionResult(session.accessToken)).toBe('email-verification-required');
  });
});
