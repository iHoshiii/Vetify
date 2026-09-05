import { USER_SUSPENSION_DAYS } from '@shared/limits';
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
import { changeUserStatus } from '../user-moderation.service';
import { currentStatus } from '../user-status.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;
const DAY = 24 * 60 * 60 * 1000;
const REASON = 'Booked appointments and never turned up to any of them.';

async function account(role: UserRole = 'user'): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `${role}${seq}@example.com`,
    password: 'pw12345678',
    name: `Person ${seq}`,
    role,
  });
}

// Moves the end of a sanction, which is the only way to test a lapse without waiting
async function endSanctionAt(user: User, statusUntil: Date | null): Promise<void> {
  await usersCollection().updateOne({ _id: user._id }, { $set: { statusUntil } });
}

describe('the date a sanction ends', () => {
  it('is thirty days out for a suspension', async () => {
    const target = await account();
    const moderator = await account('admin');

    const result = await changeUserStatus({
      id: target._id,
      moderator,
      to: 'suspended',
      reason: REASON,
    });

    const due = result?.user.statusUntil?.getTime() ?? 0;
    const expected = Date.now() + USER_SUSPENSION_DAYS * DAY;
    expect(Math.abs(due - expected)).toBeLessThan(60_000);
  });

  it('is never set for a ban', async () => {
    const target = await account();
    const moderator = await account('admin');

    const result = await changeUserStatus({
      id: target._id,
      moderator,
      to: 'banned',
      reason: REASON,
    });

    expect(result?.user.statusUntil).toBeNull();
  });
});

describe('currentStatus', () => {
  it('reinstates an account whose suspension has run out', async () => {
    const target = await account();
    const moderator = await account('admin');
    await changeUserStatus({ id: target._id, moderator, to: 'suspended', reason: REASON });
    const suspended = await findUserById(target._id);
    await endSanctionAt(target, new Date(Date.now() - DAY));

    expect(await currentStatus({ ...suspended!, statusUntil: new Date(Date.now() - DAY) })).toBe(
      'active'
    );

    const after = await findUserById(target._id);
    expect(after?.status).toBe('active');
    expect(after?.statusReason).toBeNull();
    expect(after?.statusUntil).toBeNull();
    expect(after?.statusChangedBy).toBeNull();
  });

  it('records the lift as nobody’s doing', async () => {
    const target = await account();
    const moderator = await account('admin');
    await changeUserStatus({ id: target._id, moderator, to: 'suspended', reason: REASON });
    await endSanctionAt(target, new Date(Date.now() - DAY));

    await currentStatus((await findUserById(target._id))!);

    const entry = await auditLogsCollection().findOne({ action: 'user.status.expired' });
    expect(entry?.actor).toBeNull();
    expect(entry?.metadata).toMatchObject({ email: target.email, statusTo: 'active' });
  });

  it('leaves a suspension that is still running, and a ban forever', async () => {
    const target = await account();
    const moderator = await account('admin');
    await changeUserStatus({ id: target._id, moderator, to: 'suspended', reason: REASON });
    expect(await currentStatus((await findUserById(target._id))!)).toBe('suspended');

    const banned = await account();
    await changeUserStatus({ id: banned._id, moderator, to: 'banned', reason: REASON });
    expect(await currentStatus((await findUserById(banned._id))!)).toBe('banned');

    expect(await auditLogsCollection().countDocuments({ action: 'user.status.expired' })).toBe(0);
  });
});
