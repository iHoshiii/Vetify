import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { saveAccountChange } from '../../models/users/account-change';
import { findUserById, insertUser, usersCollection } from '../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('account changes on standalone MongoDB', () => {
  it('refuses active-admin removal without weakening the invariant', async () => {
    const [first] = await Promise.all(
      ['first', 'second'].map((name) =>
        insertUser({
          email: `${name}@admin.test`,
          provider: 'google',
          role: 'admin',
        })
      )
    );
    await expect(saveAccountChange(first._id, { role: 'user' })).rejects.toMatchObject({
      statusCode: 503,
      reason: 'admin-protection-unavailable',
    });
    expect(await usersCollection().countDocuments({ role: 'admin', status: 'active' })).toBe(2);
    expect(await findUserById(first._id)).toMatchObject({ role: 'admin', status: 'active' });
  });

  it('supports ordinary restrictions and non-removing account changes', async () => {
    const user = await insertUser({ email: 'ordinary@account.test', provider: 'google' });
    await expect(saveAccountChange(user._id, { status: 'banned' }, true)).resolves.toMatchObject({
      status: 'banned',
      sessionVersion: 1,
    });
    await expect(saveAccountChange(user._id, { role: 'admin' })).resolves.toMatchObject({
      role: 'admin',
      status: 'banned',
    });
    await expect(saveAccountChange(user._id, { status: 'active' })).resolves.toMatchObject({
      role: 'admin',
      status: 'active',
    });
  });
});
