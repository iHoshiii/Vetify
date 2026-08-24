import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getDb } from '../../config/db';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { ensureIndexes } from '../index';
import { USERS_COLLECTION, insertUser, usersCollection } from '../users';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const PROVIDER_INDEX = 'provider_1_providerId_1';

function providerIndex() {
  return usersCollection()
    .indexes()
    .then((all) => all.find((i) => i.name === PROVIDER_INDEX));
}

/** Puts the collection back in the state an older deployment left it in. */
async function installLegacyProviderIndex(): Promise<void> {
  const users = getDb().collection(USERS_COLLECTION);
  await users.dropIndex(PROVIDER_INDEX).catch(() => {});
  await users.createIndexes([{ key: { provider: 1, providerId: 1 }, unique: true, sparse: true }]);
}

describe('ensureIndexes', () => {
  it('replaces an index whose options have changed', async () => {
    await installLegacyProviderIndex();
    expect((await providerIndex())?.sparse).toBe(true);

    // createIndexes on its own raises IndexOptionsConflict here and, in one call
    // with the others, used to abandon every index after it.
    await ensureIndexes();

    const updated = await providerIndex();
    expect(updated?.sparse).toBeUndefined();
    expect(updated?.partialFilterExpression).toEqual({ providerId: { $type: 'string' } });
  });

  it('leaves the rest of the plan in place when one index conflicts', async () => {
    await installLegacyProviderIndex();
    await ensureIndexes();

    const names = (await usersCollection().indexes()).map((i) => i.name);
    expect(names).toEqual(
      expect.arrayContaining(['email_1', PROVIDER_INDEX, 'role_1_createdAt_-1', 'status_1'])
    );
  });

  it('unblocks a second password signup on a database that had the old index', async () => {
    await installLegacyProviderIndex();
    await ensureIndexes();

    await insertUser({ email: 'one@example.com', password: 'pw12345678' });
    await insertUser({ email: 'two@example.com', password: 'pw12345678' });

    expect(await usersCollection().countDocuments()).toBe(2);
  });

  it('is a no-op on a second run', async () => {
    const before = await usersCollection().indexes();
    await ensureIndexes();

    expect((await usersCollection().indexes()).map((i) => i.name)).toEqual(
      before.map((i) => i.name)
    );
  });
});
