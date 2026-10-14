import { ObjectId, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db';
import { refreshTokensCollection } from './refresh-token';

export const NATIVE_SESSION_COLLECTION = 'nativesessions';
export const NATIVE_SESSION_INDEXES: IndexDescription[] = [
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  { key: { user: 1 } },
];
export type NativeSession = {
  _id: ObjectId;
  user: ObjectId;
  expiresAt: Date;
  revokedAt: Date | null;
};
export const nativeSessionsCollection = () =>
  getDb().collection<NativeSession>(NATIVE_SESSION_COLLECTION);

export async function activeNativeSession(id: string, user: string) {
  if (!ObjectId.isValid(id) || !ObjectId.isValid(user)) return null;
  const session = await nativeSessionsCollection().findOne({
    _id: new ObjectId(id),
    user: new ObjectId(user),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const refresh = await refreshTokensCollection().findOne({
    nativeSessionId: id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return refresh ? session : null;
}

export async function revokeNativeSession(id: string) {
  const now = new Date();
  await nativeSessionsCollection().updateOne(
    { _id: new ObjectId(id), revokedAt: null },
    { $set: { revokedAt: now } }
  );
  await refreshTokensCollection().updateMany(
    { nativeSessionId: id, revokedAt: null },
    { $set: { revokedAt: now, updatedAt: now } }
  );
}
