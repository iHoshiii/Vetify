import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { PETS_COLLECTION, insertPet, petsCollection, type PetAttrs } from '../pets';
import {
  findRefreshTokenWithOwner,
  hashToken,
  insertRefreshToken,
  isRefreshTokenActive,
  refreshTokensCollection,
  revokeRefreshTokenByHash,
} from '../RefreshToken';
import {
  comparePassword,
  findUserById,
  insertUser,
  toPublicUser,
  updateUser,
  usersCollection,
} from '../users';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('User', () => {
  const attrs = { email: 'Owner@Example.COM ', password: 'sup3rsecret', name: 'Ada' };

  /** Reads straight from the collection, hash included. */
  const raw = (id: ObjectId) => usersCollection().findOne({ _id: id });

  it('hashes the password on insert rather than storing plaintext', async () => {
    const user = await insertUser(attrs);
    const stored = await raw(user._id);

    expect(stored!.password).not.toBe(attrs.password);
    expect(stored!.password).toMatch(/^\$2[aby]\$/);
  });

  it('excludes the password hash from reads by default', async () => {
    const user = await insertUser(attrs);
    const fetched = await findUserById(user._id);

    expect(fetched).not.toBeNull();
    // Absent from the result rather than merely undefined: the projection has to
    // drop the field, because nothing else keeps it out any more.
    expect(Object.hasOwn(fetched!, 'password')).toBe(false);
  });

  it('normalises email to lowercase and trims it', async () => {
    const user = await insertUser(attrs);
    expect(user.email).toBe('owner@example.com');
  });

  it('rejects a duplicate email', async () => {
    await insertUser(attrs);
    await expect(insertUser({ ...attrs, name: 'Other' })).rejects.toThrow();
  });

  it('requires a password on a local account but not an OAuth one', async () => {
    await expect(insertUser({ email: 'nopw@example.com', provider: 'local' })).rejects.toThrow(
      /password is required/i
    );

    const oauth = await insertUser({
      email: 'oauth@example.com',
      provider: 'google',
      providerId: 'g-1',
    });
    expect((await raw(oauth._id))!.password).toBeNull();
  });

  it('comparePassword accepts the real password and rejects a wrong one', async () => {
    const created = await insertUser(attrs);
    const stored = (await raw(created._id))!;

    await expect(comparePassword(stored.password, 'sup3rsecret')).resolves.toBe(true);
    await expect(comparePassword(stored.password, 'wrong')).resolves.toBe(false);
  });

  it('leaves the hash alone when other fields are updated', async () => {
    const created = await insertUser(attrs);
    const hashBefore = (await raw(created._id))!.password;

    await updateUser(created._id, { name: 'Ada Lovelace' });

    const after = (await raw(created._id))!;
    expect(after.name).toBe('Ada Lovelace');
    expect(after.password).toBe(hashBefore);
    await expect(comparePassword(after.password, 'sup3rsecret')).resolves.toBe(true);
  });

  it('toPublicUser omits the hash', async () => {
    const user = await insertUser(attrs);
    const pub = toPublicUser(user);

    expect(pub).toEqual({
      id: user._id.toString(),
      email: 'owner@example.com',
      name: 'Ada',
      provider: 'local',
      avatarUrl: null,
      emailVerified: false,
    });
    expect(JSON.stringify(pub)).not.toContain('$2');
  });
});

describe('Pet', () => {
  async function ownerId() {
    const user = await insertUser({ email: 'o@example.com', password: 'pw12345678' });
    return user._id;
  }

  it('applies the migration-matching avatar defaults', async () => {
    const pet = await insertPet({ name: 'Rex', species: 'dog', owner: await ownerId() });

    expect(pet.avatar).toEqual({ url: null, color: '#A78BFA', initials: true });
  });

  it('requires name, species and owner', async () => {
    await expect(insertPet({ name: 'Rex' } as PetAttrs)).rejects.toThrow(/species|owner/i);
  });

  it('rejects a negative age', async () => {
    await expect(
      insertPet({ name: 'Rex', species: 'dog', age: -1, owner: await ownerId() })
    ).rejects.toThrow(/negative/i);
  });

  it('writes to the pets collection the earlier migration targeted', async () => {
    const pet = await insertPet({ name: 'Rex', species: 'dog', owner: await ownerId() });

    expect(PETS_COLLECTION).toBe('pets');
    expect(await petsCollection().countDocuments({ _id: pet._id })).toBe(1);
  });
});

describe('RefreshToken', () => {
  function owner() {
    return insertUser({ email: 'o@example.com', password: 'pw12345678' });
  }

  const future = () => new Date(Date.now() + 60_000);
  const past = () => new Date(Date.now() - 60_000);

  it('hashToken is deterministic and not the input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
    expect(hashToken('abc')).toHaveLength(64);
  });

  it('isRefreshTokenActive is true only when unrevoked and unexpired', async () => {
    const user = await owner();

    const live = await insertRefreshToken({
      tokenHash: hashToken('a'),
      user: user._id,
      expiresAt: future(),
    });
    const expired = await insertRefreshToken({
      tokenHash: hashToken('b'),
      user: user._id,
      expiresAt: past(),
    });

    await insertRefreshToken({ tokenHash: hashToken('c'), user: user._id, expiresAt: future() });
    expect(await revokeRefreshTokenByHash(hashToken('c'))).toBe(true);
    const revoked = (await refreshTokensCollection().findOne({ tokenHash: hashToken('c') }))!;

    expect(isRefreshTokenActive(live)).toBe(true);
    expect(isRefreshTokenActive(expired)).toBe(false);
    expect(isRefreshTokenActive(revoked)).toBe(false);
  });

  it('reports nothing revoked when the hash is unknown', async () => {
    expect(await revokeRefreshTokenByHash(hashToken('never-issued'))).toBe(false);
  });

  it('rejects a duplicate token hash', async () => {
    const user = await owner();
    await insertRefreshToken({ tokenHash: hashToken('a'), user: user._id, expiresAt: future() });

    await expect(
      insertRefreshToken({ tokenHash: hashToken('a'), user: user._id, expiresAt: future() })
    ).rejects.toThrow();
  });

  it('joins the owner without carrying their password hash across', async () => {
    const user = await owner();
    await insertRefreshToken({
      tokenHash: hashToken('joined'),
      user: user._id,
      expiresAt: future(),
    });

    const found = await findRefreshTokenWithOwner(hashToken('joined'));

    expect(found!.owner!.email).toBe('o@example.com');
    // The $lookup pulls the whole user document, so the pipeline has to drop the
    // hash on the way out.
    expect(Object.hasOwn(found!.owner!, 'password')).toBe(false);
  });

  it('returns an orphaned token with a null owner rather than nothing', async () => {
    await insertRefreshToken({
      tokenHash: hashToken('orphan'),
      user: new ObjectId(),
      expiresAt: future(),
    });

    const found = await findRefreshTokenWithOwner(hashToken('orphan'));

    expect(found).not.toBeNull();
    expect(found!.owner).toBeNull();
  });

  it('returns null when no token has that hash', async () => {
    expect(await findRefreshTokenWithOwner(hashToken('absent'))).toBeNull();
  });
});
