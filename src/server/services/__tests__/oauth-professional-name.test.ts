import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '../../config/db';
import { insertAuthIdentity } from '../../models/auth-identities';
import { insertUser, usersCollection } from '../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import { findOrCreateOAuthUser } from '../auth.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe.each(['google', 'local'] as const)(
  'professional name with %s account origin',
  (provider) => {
    it('restores the approved name and keeps it when the social display name changes', async () => {
      const owner = await insertUser({
        name: 'Vetify',
        email: 'professional@example.com',
        provider,
        providerId: provider === 'google' ? 'google-professional' : null,
        password: provider === 'local' ? 'Sup3rSecret!' : null,
        role: 'professional',
        emailVerified: true,
      });
      await getDb().collection('professionals').insertOne({
        _id: new ObjectId(),
        user: owner._id,
        status: 'verified',
        fullName: 'Mitz Laureine Bahiwal Dugyon',
      });
      if (provider === 'local') {
        await insertAuthIdentity({
          user: owner._id,
          provider: 'google',
          providerId: 'google-professional',
        });
      }
      const before = await usersCollection().findOne({ _id: owner._id });
      const profile = {
        providerId: 'google-professional',
        email: owner.email,
        name: 'Google Display Name',
        emailVerified: true,
        avatarUrl: null,
      };
      const first = await findOrCreateOAuthUser('google', profile);
      const second = await findOrCreateOAuthUser('google', {
        ...profile,
        name: 'Another Display Name',
      });
      expect(first).toMatchObject({
        _id: owner._id,
        name: 'Mitz Laureine Bahiwal Dugyon',
        role: 'professional',
        provider,
      });
      expect(second).toMatchObject({
        _id: owner._id,
        name: first.name,
        role: 'professional',
        provider,
      });
      const stored = await usersCollection().findOne({ _id: owner._id });
      expect(stored?.password).toBe(before?.password);
      expect(stored?.providerId).toBe(before?.providerId);
      expect(stored?.emailVerified).toBe(true);
      expect(await usersCollection().countDocuments()).toBe(1);
    });
  }
);
