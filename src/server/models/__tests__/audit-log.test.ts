import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getDb } from '../../config/db';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { AUDIT_LOGS_COLLECTION, auditLogsCollection, recordAudit } from '../audit-log';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

/** Same failure injection the activity events use, pointed at this collection. */
async function rejectWrites(reject: boolean): Promise<void> {
  await getDb().command({
    collMod: AUDIT_LOGS_COLLECTION,
    validator: reject ? { action: { $eq: '__nothing_matches_this__' } } : {},
    validationLevel: reject ? 'strict' : 'off',
  });
}

describe('recordAudit', () => {
  const target = new ObjectId();

  it('records who did what to whom, and why', async () => {
    const actor = new ObjectId();

    await recordAudit({
      actor,
      actorEmail: 'admin@example.com',
      action: 'user.role.changed',
      targetType: 'user',
      targetId: target,
      reason: 'promoted after licence check',
      metadata: { from: 'user', to: 'professional' },
      ip: '203.0.113.4',
    });

    const entry = await auditLogsCollection().findOne({});
    expect(entry).toMatchObject({
      actor,
      // Copied, not joined: the entry has to still name the actor after that
      // account is renamed or deleted.
      actorEmail: 'admin@example.com',
      action: 'user.role.changed',
      targetType: 'user',
      targetId: target,
      reason: 'promoted after licence check',
      metadata: { from: 'user', to: 'professional' },
      ip: '203.0.113.4',
    });
    expect(entry!.createdAt).toBeInstanceOf(Date);
  });

  it('attributes a system action to nobody rather than inventing an actor', async () => {
    // What `seed:admin` writes: the first grant happens before any admin exists to
    // credit it to.
    await recordAudit({
      action: 'user.role.changed',
      targetType: 'user',
      targetId: target,
      reason: 'bootstrap via seed:admin',
    });

    const entry = await auditLogsCollection().findOne({});
    expect(entry).toMatchObject({ actor: null, actorEmail: null, ip: null, metadata: {} });
  });

  it('stores ids the routes pass as strings as real ObjectIds', async () => {
    const actor = new ObjectId();

    await recordAudit({
      actor: actor.toString(),
      action: 'user.role.changed',
      targetType: 'user',
      targetId: target.toString(),
    });

    const entry = await auditLogsCollection().findOne({});
    // Stored as strings these would miss the `{ targetType, targetId }` index and
    // every join the audit screen makes.
    expect(entry!.actor).toEqual(actor);
    expect(entry!.targetId).toEqual(target);
  });

  it('returns the entry it wrote so a handler need not read it back', async () => {
    const written = await recordAudit({
      action: 'user.role.changed',
      targetType: 'user',
      targetId: target,
    });

    expect(await auditLogsCollection().findOne({ _id: written._id })).toEqual(written);
  });

  it('fails loudly when the entry cannot be written', async () => {
    await rejectWrites(true);

    try {
      // The deliberate opposite of recordActivity: a privileged action with no
      // record of it is worse than one that reports an error.
      await expect(
        recordAudit({ action: 'user.role.changed', targetType: 'user', targetId: target })
      ).rejects.toThrow();
    } finally {
      await rejectWrites(false);
    }
  });
});

describe('audit log indexes', () => {
  it('keeps entries forever — no TTL', async () => {
    const indexes = await auditLogsCollection().indexes();

    // The activity events expire at 90 days. Accountability records are the one
    // thing that has to outlive a retention window.
    expect(indexes.every((index) => index.expireAfterSeconds === undefined)).toBe(true);
  });

  it('indexes the three views the audit screen offers', async () => {
    const keys = (await auditLogsCollection().indexes()).map((index) => index.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        { createdAt: -1 },
        { actor: 1, createdAt: -1 },
        { targetType: 1, targetId: 1, createdAt: -1 },
      ])
    );
  });
});
