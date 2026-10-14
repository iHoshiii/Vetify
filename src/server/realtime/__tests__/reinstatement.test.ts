import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { findRefreshTokenWithOwner, hashToken } from '../../models/refresh-token';
import { findUserById, insertUser, updateUser } from '../../models/users';
import * as restrictions from '../../models/users/restrict-account';
import { createAuthPayloadFor } from '../../services/auth.service';
import { activeSessionUser } from '../../services/session-access.service';
import { changeUserStatus } from '../../services/user-moderation.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { connected, event, startSockets, stopSockets } from './socket-fixtures';

beforeAll(startTestDb);
beforeEach(startSockets);
afterEach(async () => {
  vi.restoreAllMocks();
  await stopSockets();
  await clearTestDb();
});
afterAll(stopTestDb);

describe('account reinstatement during old-session cleanup', () => {
  it('preserves a new sign-in after reinstatement and closes the old sign-in', async () => {
    const owner = await insertUser({ email: 'restored@test.invalid', provider: 'google' });
    const admin = await insertUser({
      email: 'admin@test.invalid',
      provider: 'google',
      role: 'admin',
    });
    const oldAuth = await createAuthPayloadFor(owner);
    const oldSocket = await connected(owner);
    const oldDisconnected = event(oldSocket, 'disconnect');
    const restrict = restrictions.restrictAccount;
    let freshSocket: Socket | undefined;
    let freshToken = '';
    vi.spyOn(restrictions, 'restrictAccount').mockImplementationOnce(async (id, patch) => {
      const saved = await restrict(id, patch);
      await updateUser(id, { status: 'active', statusUntil: null });
      const restored = (await findUserById(id))!;
      freshSocket = await connected(restored);
      freshToken = (await createAuthPayloadFor(restored)).refreshToken;
      return saved;
    });
    const result = await changeUserStatus({
      id: owner._id,
      moderator: admin,
      to: 'suspended',
      reason: 'Restriction test',
    });
    await oldDisconnected;
    expect(result?.sessionsRevoked).toBe(1);
    expect(oldSocket.connected).toBe(false);
    expect(freshSocket?.connected).toBe(true);
    expect(
      (await findRefreshTokenWithOwner(hashToken(oldAuth.refreshToken)))?.revokedAt
    ).toBeInstanceOf(Date);
    expect((await findRefreshTokenWithOwner(hashToken(freshToken)))?.revokedAt).toBeNull();
    await expect(activeSessionUser(owner._id.toString(), 0)).rejects.toMatchObject({
      reason: 'session-revoked',
    });
    await expect(activeSessionUser(owner._id.toString(), 1)).resolves.toMatchObject({
      status: 'active',
    });
  });
});
