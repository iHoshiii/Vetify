import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../../app';
import { countActiveAdmins, findUserById, insertUser, type User } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { changeUserRole, changeUserStatus } from '../../../services/user-moderation.service';
import { clearTestDb } from '../../../test-utils/db';
import { startReplicaTestDb, stopReplicaTestDb } from '../../../test-utils/repl-db';

const app = createApp();
beforeAll(startReplicaTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopReplicaTestDb);

function deactivate(user: User) {
  const token = signAccessToken({ sub: user._id.toString(), email: user.email, role: user.role });
  return request(app)
    .post('/api/v1/account/deactivate')
    .set('Authorization', `Bearer ${token}`)
    .send({ confirmation: 'DEACTIVATE' });
}

function admin(name: string) {
  return insertUser({ email: `${name}@admin.test`, provider: 'google', role: 'admin' });
}

describe('admin self-deactivation', () => {
  it('refuses to deactivate the last active admin', async () => {
    const owner = await admin('last');
    const response = await deactivate(owner);
    expect(response.status).toBe(409);
    expect(response.body.reason).toBe('last-admin');
    expect(await findUserById(owner._id)).toMatchObject({ status: 'active', sessionVersion: 0 });
  });

  it('allows only one of two simultaneous admin self-deactivations', async () => {
    const [first, second] = await Promise.all([admin('first'), admin('second')]);
    const responses = await Promise.all([deactivate(first), deactivate(second)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await countActiveAdmins()).toBe(1);
  });

  it.each(['role', 'status'] as const)(
    'serializes self-deactivation with a %s change',
    async (kind) => {
      const [first, second] = await Promise.all([admin('first'), admin('second')]);
      const change =
        kind === 'role'
          ? changeUserRole({ id: second._id, moderator: first, to: 'user' })
          : changeUserStatus({ id: second._id, moderator: first, to: 'banned', reason: 'Test' });
      const outcomes = await Promise.allSettled([deactivate(first), change]);
      const success = outcomes.filter(
        (outcome) =>
          outcome.status === 'fulfilled' &&
          outcome.value !== null &&
          (!('status' in outcome.value) || outcome.value.status === 200)
      );
      expect(success).toHaveLength(1);
      expect(await countActiveAdmins()).toBe(1);
    }
  );
});
