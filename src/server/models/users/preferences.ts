import {
  defaultUserPreferences,
  type UserPreferences,
  type UserPreferencesUpdate,
} from '@shared/schemas';
import { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { hashPassword } from './security';
import { usersCollection } from './repository';
import type { UserDocument } from './types';

// read one account's settings; falls back to defaults for accounts saved before the field existed
export async function getPreferences(id: string | ObjectId): Promise<UserPreferences | null> {
  const user = await usersCollection().findOne(
    { _id: toObjectId(id) },
    { projection: { preferences: 1 } }
  );
  if (!user) return null;
  const defaults = defaultUserPreferences();
  return {
    notifications: user.preferences?.notifications ?? defaults.notifications,
    privacy: user.preferences?.privacy ?? defaults.privacy,
    region: user.preferences?.region ?? defaults.region,
  };
}

// replace whole sections over the current settings, so an untouched section survives and a legacy account gains the missing one
export async function updatePreferences(
  id: string | ObjectId,
  patch: UserPreferencesUpdate
): Promise<UserPreferences | null> {
  const current = await getPreferences(id);
  if (!current) return null;
  const next: UserPreferences = {
    notifications: patch.notifications ?? current.notifications,
    privacy: patch.privacy ?? current.privacy,
    region: patch.region ?? current.region,
  };
  await usersCollection().updateOne(
    { _id: toObjectId(id) },
    { $set: { preferences: next, updatedAt: new Date() } }
  );
  return next;
}

// The password hash sits off the public projection, so a credential check reads the whole document by id.
export function findUserWithPasswordById(id: string | ObjectId): Promise<UserDocument | null> {
  return usersCollection().findOne({ _id: toObjectId(id) });
}

// Writes a new password hash once the caller has proven the current one.
export async function updateUserPassword(
  id: string | ObjectId,
  plain: string
): Promise<number | null> {
  const result = await usersCollection().findOneAndUpdate(
    { _id: toObjectId(id) },
    {
      $set: { password: await hashPassword(plain), updatedAt: new Date() },
      $inc: { sessionVersion: 1 },
      $unset: { passwordReset: '' },
    },
    { returnDocument: 'after', projection: { sessionVersion: 1 } }
  );
  return result?.sessionVersion ?? null;
}
