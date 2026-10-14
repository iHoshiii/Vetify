import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { auditLogsCollection } from '../../models/audit-log';
import { findUserById, insertUser, updateUser } from '../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { currentStatus } from '../user-status.service';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

async function expiredAccount() {
  const user = await insertUser({ email: 'expired@test.invalid', provider: 'google' });
  return (await updateUser(user._id, {
    status: 'suspended',
    statusUntil: new Date(Date.now() - 60_000),
  }))!;
}

describe('suspension lift concurrency', () => {
  it('never overwrites a newer ban with an old suspension snapshot', async () => {
    const snapshot = await expiredAccount();
    await updateUser(snapshot._id, { status: 'banned', statusUntil: null });
    expect(await currentStatus(snapshot)).toBe('banned');
    expect((await findUserById(snapshot._id))?.status).toBe('banned');
    expect(await auditLogsCollection().countDocuments({ action: 'user.status.expired' })).toBe(0);
  });

  it('respects a newer extended suspension', async () => {
    const snapshot = await expiredAccount();
    await updateUser(snapshot._id, { statusUntil: new Date(Date.now() + 60_000) });
    expect(await currentStatus(snapshot)).toBe('suspended');
  });

  it('records only one lift when two requests check the same expired suspension', async () => {
    const snapshot = await expiredAccount();
    expect(await Promise.all([currentStatus(snapshot), currentStatus(snapshot)])).toEqual([
      'active',
      'active',
    ]);
    expect(await auditLogsCollection().countDocuments({ action: 'user.status.expired' })).toBe(1);
  });
});
