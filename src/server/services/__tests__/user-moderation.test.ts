import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import {
  auditLogsCollection,
  findUserById,
  insertUser,
  usersCollection,
  type User,
  type UserRole,
} from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { changeUserRole, changeUserStatus } from '../user-moderation.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

async function account(role: UserRole = 'user'): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `${role}${seq}@example.com`,
    password: 'pw12345678',
    name: `Person ${seq}`,
    role,
  });
}

const REASON = 'Left the team and no longer needs the access.';

/**
 * These cover the guards from below the HTTP routes, where the acting moderator
 * is not necessarily an admin — a script, or a future automation. Over the routes
 * the last-admin check cannot fire, since the acting admin is an active admin
 * themselves and is barred from actioning their own account; that is exactly why
 * it is worth testing here, where it can.
 */
describe('the last active admin', () => {
  it('cannot be demoted', async () => {
    const admin = await account('admin');
    const actor = await account('user');

    await expect(
      changeUserRole({ id: admin._id, moderator: actor, to: 'user' })
    ).rejects.toMatchObject({ statusCode: 409, reason: 'last-admin' });

    expect((await findUserById(admin._id))?.role).toBe('admin');
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });

  it('cannot be banned', async () => {
    const admin = await account('admin');
    const actor = await account('user');

    await expect(
      changeUserStatus({ id: admin._id, moderator: actor, to: 'banned', reason: REASON })
    ).rejects.toMatchObject({ statusCode: 409, reason: 'last-admin' });

    expect((await findUserById(admin._id))?.status).toBe('active');
  });

  it('can be demoted once a second admin exists', async () => {
    const admin = await account('admin');
    await account('admin');
    const actor = await account('user');

    const result = await changeUserRole({ id: admin._id, moderator: actor, to: 'user' });

    expect(result?.to).toBe('user');
    expect((await findUserById(admin._id))?.role).toBe('user');
  });
});

describe('changeUserRole', () => {
  it('returns null for an account that is gone', async () => {
    const actor = await account('admin');
    const ghost = await account('user');

    // Nothing in the app deletes accounts, so this stands in for a stale id from
    // a list the admin loaded a while ago.
    await usersCollection().deleteOne({ _id: ghost._id });

    expect(await changeUserRole({ id: ghost._id, moderator: actor, to: 'admin' })).toBeNull();
  });

  it('records the promotion with its before and after', async () => {
    const actor = await account('admin');
    const target = await account('user');

    await changeUserRole({ id: target._id, moderator: actor, to: 'professional', ip: '10.0.0.7' });

    const entry = await auditLogsCollection().findOne({});
    expect(entry).toMatchObject({ action: 'user.role.changed', ip: '10.0.0.7' });
    expect(entry?.metadata).toMatchObject({ roleFrom: 'user', roleTo: 'professional' });
  });
});

describe('changeUserStatus', () => {
  it('demands a reason for anything but reinstatement', async () => {
    const actor = await account('admin');
    const target = await account('user');

    await expect(
      changeUserStatus({ id: target._id, moderator: actor, to: 'suspended', reason: '   ' })
    ).rejects.toMatchObject({ statusCode: 400, reason: 'reason-required' });
  });

  it('reports zero closed sessions when nobody was signed in', async () => {
    const actor = await account('admin');
    const target = await account('user');

    const result = await changeUserStatus({
      id: target._id,
      moderator: actor,
      to: 'suspended',
      reason: REASON,
    });

    expect(result?.sessionsRevoked).toBe(0);
    expect(result?.user.statusReason).toBe(REASON);
  });
});
