import { ObjectId, type IndexDescription } from 'mongodb';
import crypto from 'node:crypto';
import { getDb } from '../config/db';
import { NATIVE_HANDOFF_SECONDS } from '../../shared/native-auth';
import { hashToken } from './refresh-token';

export const NATIVE_HANDOFF_COLLECTION = 'nativehandoffs';
export const NATIVE_HANDOFF_INDEXES: IndexDescription[] = [
  { key: { codeHash: 1 }, unique: true },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  { key: { sourceTokenHash: 1 } },
];
type NativeHandoff = {
  _id: ObjectId;
  codeHash: string;
  user: ObjectId;
  sourceTokenHash: string;
  clientId: string;
  redirectUri: string;
  expiresAt: Date;
  consumedAt: Date | null;
};
export const nativeHandoffsCollection = () =>
  getDb().collection<NativeHandoff>(NATIVE_HANDOFF_COLLECTION);

export async function createNativeHandoff(input: {
  user: ObjectId;
  sourceTokenHash: string;
  clientId: string;
  redirectUri: string;
}) {
  const code = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + NATIVE_HANDOFF_SECONDS * 1000);
  await nativeHandoffsCollection().updateMany(
    { sourceTokenHash: input.sourceTokenHash, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );
  await nativeHandoffsCollection().insertOne({
    ...input,
    _id: new ObjectId(),
    codeHash: hashToken(code),
    expiresAt,
    consumedAt: null,
  });
  const url = new URL(input.redirectUri);
  url.searchParams.set('code', code);
  return { url: url.toString(), expiresAt: expiresAt.toISOString() };
}

export async function consumeNativeHandoff(input: {
  code: string;
  clientId: string;
  redirectUri: string;
}) {
  return nativeHandoffsCollection().findOneAndUpdate(
    {
      codeHash: hashToken(input.code),
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
