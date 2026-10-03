import { MongoServerError } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getDb } from '../../config/db';
import { auditLogsCollection } from '../../models/audit-log';
import { findUserById, insertUser, usersCollection, type User } from '../../models/users';
import * as restrictions from '../../models/users/restrict-account';
import { clearTestDb } from '../../test-utils/db';
import { startReplicaTestDb, stopReplicaTestDb } from '../../test-utils/repl-db';
import { changeUserRole, changeUserStatus } from '../user-moderation.service';

beforeAll(startReplicaTestDb, 120_000);
afterEach(async () => {
  vi.restoreAllMocks();
  await clearTestDb();
});
afterAll(stopReplicaTestDb);

async function admins() {
  return Promise.all(
    ['first', 'second'].map((name) =>
      insertUser({
        email: `${name}@admin.test`,
        provider: 'google',
        role: 'admin',
      })
    )
  );
}

function remove(kind: 'role' | 'status', target: User, moderator: User) {
  return kind === 'role'
    ? changeUserRole({ id: target._id, moderator, to: 'user' })
    : changeUserStatus({ id: target._id, moderator, to: 'banned', reason: 'Concurrency test' });
}

function guards() {
  return getDb().collection<{ _id: string; revision: number }>('accountguards');
}

describe('serialized admin removal', () => {
  it('protects an account promoted after the initial moderation read', async () => {
    const [first, second] = await admins();
    await usersCollection().updateOne({ _id: first._id }, { $set: { role: 'user' } });
    const original = restrictions.restrictAccount;
    vi.spyOn(restrictions, 'restrictAccount').mockImplementationOnce(async (id, patch, options) => {
      await usersCollection().updateOne({ _id: first._id }, { $set: { role: 'admin' } });
      await usersCollection().updateOne({ _id: second._id }, { $set: { role: 'user' } });
      return original(id, patch, options);
    });
    await expect(remove('status', first, second)).rejects.toMatchObject({ reason: 'last-admin' });
    expect(await findUserById(first._id)).toMatchObject({ role: 'admin', status: 'active' });
    expect(await auditLogsCollection().countDocuments()).toBe(0);
  });

  it.each([
    ['role', 'role'],
    ['role', 'status'],
    ['status', 'status'],
  ] as const)('keeps one active admin after concurrent %s/%s changes', async (left, right) => {
    const [first, second] = await admins();
    const outcomes = await Promise.allSettled([
      remove(left, first, second),
      remove(right, second, first),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toMatchObject({
      statusCode: 409,
      reason: 'last-admin',
    });
    expect(await usersCollection().countDocuments({ role: 'admin', status: 'active' })).toBe(1);
    expect(await auditLogsCollection().countDocuments()).toBe(1);
    expect((await guards().findOne({ _id: 'active-admins' }))?.revision).toBe(1);
  });

  it('rolls back the account and guard if the transaction fails after its write', async () => {
    const [first, second] = await admins();
    const original = restrictions.restrictAccount;
    vi.spyOn(restrictions, 'restrictAccount').mockImplementation(async (id, patch, options) => {
      const saved = await original(id, patch, options);
      if (options?.session && saved) throw new Error('Transaction interrupted');
      return saved;
    });
    await expect(remove('status', first, second)).rejects.toThrow('Transaction interrupted');
    expect(await findUserById(first._id)).toMatchObject({ status: 'active', sessionVersion: 0 });
    expect((await guards().findOne({ _id: 'active-admins' }))?.revision).toBe(0);
    expect(await auditLogsCollection().countDocuments()).toBe(0);
    vi.restoreAllMocks();
    await remove('status', first, second);
    expect(await usersCollection().countDocuments({ role: 'admin', status: 'active' })).toBe(1);
  });

  it('retries a transient aborted transaction without consuming two admin removals', async () => {
    const [first, second] = await admins();
    const original = restrictions.restrictAccount;
    let writes = 0;
    vi.spyOn(restrictions, 'restrictAccount').mockImplementation(async (id, patch, options) => {
      const saved = await original(id, patch, options);
      if (options?.session && saved && ++writes === 1) {
        throw new MongoServerError({
          message: 'Injected transaction conflict',
          code: 112,
          errorLabels: ['TransientTransactionError'],
        });
      }
      return saved;
    });
    await remove('status', first, second);
    expect(writes).toBe(2);
    expect(await findUserById(first._id)).toMatchObject({ status: 'banned', sessionVersion: 1 });
    expect((await guards().findOne({ _id: 'active-admins' }))?.revision).toBe(1);
    expect(await usersCollection().countDocuments({ role: 'admin', status: 'active' })).toBe(1);
    expect(await auditLogsCollection().countDocuments()).toBe(1);
  });
});
