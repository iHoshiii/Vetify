import { ObjectId, type IndexDescription } from 'mongodb';
import { getDb } from '../config/db';
import { usersCollection } from './users';

export const EMAIL_VERIFICATIONS_COLLECTION = 'email_verifications';
export const EMAIL_VERIFICATION_COOLDOWN_MS = 60_000;
export const EMAIL_VERIFICATION_INDEXES: IndexDescription[] = [
  { key: { hash: 1 }, unique: true },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];

export type EmailVerificationDocument = {
  _id: ObjectId;
  email: string;
  hash: string;
  expiresAt: Date;
  requestedAt: Date;
  consumedAt: Date | null;
};

export function emailVerificationsCollection() {
  return getDb().collection<EmailVerificationDocument>(EMAIL_VERIFICATIONS_COLLECTION);
}

export async function ensureEmailVerificationIndexes(): Promise<void> {
  await emailVerificationsCollection().createIndexes(EMAIL_VERIFICATION_INDEXES);
}

export async function issueEmailVerification(
  user: ObjectId,
  email: string,
  hash: string,
  expiresAt: Date
): Promise<EmailVerificationDocument | null> {
  const now = new Date();
  try {
    return await emailVerificationsCollection().findOneAndUpdate(
      {
        _id: user,
        $or: [
          { requestedAt: { $lte: new Date(now.getTime() - EMAIL_VERIFICATION_COOLDOWN_MS) } },
          { requestedAt: { $exists: false } },
        ],
      },
      { $set: { email, hash, expiresAt, requestedAt: now, consumedAt: null } },
      { upsert: true, returnDocument: 'after' }
    );
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return null;
    throw error;
  }
}

export function findEmailVerification(hash: string) {
  return emailVerificationsCollection().findOne({
    hash,
    expiresAt: { $gt: new Date() },
    consumedAt: null,
  });
}

export async function invalidateEmailVerification(user: ObjectId, hash: string): Promise<void> {
  await emailVerificationsCollection().updateOne(
    { _id: user, hash, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );
}

export async function consumeEmailVerification(hash: string): Promise<boolean> {
  const consumedAt = new Date();
  const token = await emailVerificationsCollection().findOneAndUpdate(
    { hash, expiresAt: { $gt: consumedAt }, consumedAt: null },
    { $set: { consumedAt } },
    { returnDocument: 'after' }
  );
  if (!token) return false;
  try {
    const result = await usersCollection().updateOne(
      {
        _id: token._id,
        email: token.email,
        provider: 'local',
        emailVerified: { $ne: true },
        $or: [{ status: 'active' }, { status: { $exists: false } }],
      },
      { $set: { emailVerified: true, updatedAt: new Date() } }
    );
    return result.modifiedCount === 1;
  } catch (error) {
    await emailVerificationsCollection()
      .updateOne({ _id: token._id, hash, consumedAt }, { $set: { consumedAt: null } })
      .catch(() => console.error('[auth] Verification consumption could not be released'));
    throw error;
  }
}
