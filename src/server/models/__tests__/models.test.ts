import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { Pet } from '../Pet';
import { RefreshToken, hashToken } from '../RefreshToken';
import { User } from '../User';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 120_000);

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('User', () => {
  const attrs = { email: 'Owner@Example.COM ', password: 'sup3rsecret', name: 'Ada' };

  it('hashes the password on save rather than storing plaintext', async () => {
    const user = await User.create(attrs);
    const stored = await User.findById(user._id).select('+password');

    expect(stored!.password).not.toBe(attrs.password);
    expect(stored!.password).toMatch(/^\$2[aby]\$/);
  });

  it('excludes the password hash from queries by default', async () => {
    const user = await User.create(attrs);
    const fetched = await User.findById(user._id);

    expect(fetched!.get('password')).toBeUndefined();
  });

  it('normalises email to lowercase and trims it', async () => {
    const user = await User.create(attrs);
    expect(user.email).toBe('owner@example.com');
  });

  it('rejects a duplicate email', async () => {
    await User.create(attrs);
    await User.init(); // indexes are built lazily; unique needs them present
    await expect(User.create({ ...attrs, name: 'Other' })).rejects.toThrow();
  });

  it('comparePassword accepts the real password and rejects a wrong one', async () => {
    const created = await User.create(attrs);
    const user = (await User.findById(created._id).select('+password'))!;

    await expect(user.comparePassword('sup3rsecret')).resolves.toBe(true);
    await expect(user.comparePassword('wrong')).resolves.toBe(false);
  });

  it('does not re-hash an unchanged password on subsequent saves', async () => {
    const created = await User.create(attrs);
    const first = (await User.findById(created._id).select('+password'))!;
    const hashBefore = first.password;

    first.name = 'Ada Lovelace';
    await first.save();

    const after = (await User.findById(created._id).select('+password'))!;
    expect(after.password).toBe(hashBefore);
    await expect(after.comparePassword('sup3rsecret')).resolves.toBe(true);
  });

  it('toPublic omits the hash', async () => {
    const user = await User.create(attrs);
    const pub = user.toPublic();

    expect(pub).toEqual({ id: user._id.toString(), email: 'owner@example.com', name: 'Ada' });
    expect(JSON.stringify(pub)).not.toContain('$2');
  });
});

describe('Pet', () => {
  async function owner() {
    return User.create({ email: 'o@example.com', password: 'pw12345678' });
  }

  it('applies the migration-matching avatar defaults', async () => {
    const pet = await Pet.create({ name: 'Rex', species: 'dog', owner: (await owner())._id });

    expect(pet.avatar).toMatchObject({ url: null, color: '#A78BFA', initials: true });
  });

  it('requires name, species and owner', async () => {
    await expect(Pet.create({ name: 'Rex' })).rejects.toThrow(/species|owner/i);
  });

  it('rejects a negative age', async () => {
    await expect(
      Pet.create({ name: 'Rex', species: 'dog', age: -1, owner: (await owner())._id })
    ).rejects.toThrow(/negative/i);
  });

  it('writes to the pets collection the earlier migration targeted', () => {
    expect(Pet.collection.collectionName).toBe('pets');
  });
});

describe('RefreshToken', () => {
  async function owner() {
    return User.create({ email: 'o@example.com', password: 'pw12345678' });
  }

  const future = () => new Date(Date.now() + 60_000);
  const past = () => new Date(Date.now() - 60_000);

  it('hashToken is deterministic and not the input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe('abc');
    expect(hashToken('abc')).toHaveLength(64);
  });

  it('isActive is true only when unrevoked and unexpired', async () => {
    const user = await owner();

    const live = await RefreshToken.create({
      tokenHash: hashToken('a'),
      user: user._id,
      expiresAt: future(),
    });
    const expired = await RefreshToken.create({
      tokenHash: hashToken('b'),
      user: user._id,
      expiresAt: past(),
    });
    const revoked = await RefreshToken.create({
      tokenHash: hashToken('c'),
      user: user._id,
      expiresAt: future(),
      revokedAt: new Date(),
    });

    expect(live.isActive()).toBe(true);
    expect(expired.isActive()).toBe(false);
    expect(revoked.isActive()).toBe(false);
  });

  it('rejects a duplicate token hash', async () => {
    const user = await owner();
    await RefreshToken.create({ tokenHash: hashToken('a'), user: user._id, expiresAt: future() });
    await RefreshToken.init();

    await expect(
      RefreshToken.create({ tokenHash: hashToken('a'), user: user._id, expiresAt: future() })
    ).rejects.toThrow();
  });
});
