import { ObjectId, type IndexDescription } from 'mongodb';
import crypto from 'node:crypto';
import { getDb } from '../config/db';
import { NATIVE_HANDOFF_SECONDS, type NativeSocialContext } from '../../shared/native-auth';
import { hashToken } from './refresh-token';

export const NATIVE_SOCIAL_GRANT_COLLECTION = 'nativesocialgrants';
export const NATIVE_SOCIAL_GRANT_INDEXES: IndexDescription[] = [
  { key: { codeHash: 1 }, unique: true },
  { key: { oauthStateHash: 1 }, unique: true },
  // Keep the consumed OAuth nonce beyond its signed cookie lifetime, even though
  // exchanging the mobile code stops being possible after 60 seconds.
  { key: { cleanupAt: 1 }, expireAfterSeconds: 0 },
];
type NativeSocialGrant = NativeSocialContext & {
  _id: ObjectId;
  user: ObjectId;
  codeHash: string;
  oauthStateHash: string;
  expiresAt: Date;
  cleanupAt: Date;
  consumedAt: Date | null;
};
export const nativeSocialGrantsCollection = () =>
  getDb().collection<NativeSocialGrant>(NATIVE_SOCIAL_GRANT_COLLECTION);

export async function createNativeSocialGrant(
  native: NativeSocialContext,
  user: ObjectId,
  oauthState: string
) {
  const code = crypto.randomBytes(32).toString('hex');
  await nativeSocialGrantsCollection().insertOne({
    ...native,
    _id: new ObjectId(),
    user,
    codeHash: hashToken(code),
    oauthStateHash: hashToken(oauthState),
    expiresAt: new Date(Date.now() + NATIVE_HANDOFF_SECONDS * 1000),
    cleanupAt: new Date(Date.now() + 12 * 60 * 1000),
    consumedAt: null,
  });
  const url = new URL(native.redirectUri);
  url.searchParams.set('code', code);
  url.searchParams.set('state', native.state);
  return url.toString();
}

export async function consumeNativeSocialGrant(
  input: Pick<NativeSocialContext, 'clientId' | 'redirectUri'> & {
    code: string;
    codeVerifier: string;
  }
) {
  const codeChallenge = crypto.createHash('sha256').update(input.codeVerifier).digest('base64url');
  return nativeSocialGrantsCollection().findOneAndUpdate(
    {
      codeHash: hashToken(input.code),
      codeChallenge,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
