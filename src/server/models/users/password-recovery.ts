import { ObjectId } from 'mongodb';
import { usersCollection } from './repository';
import { hashPassword } from './security';
import { normalizeEmail } from './validation';
import type { UserDocument } from './types';

const activePasswordAccount = {
  password: { $type: 'string' as const },
  $and: [{ $or: [{ status: 'active' as const }, { status: { $exists: false } }] }],
};

type RecoveryAccount = Pick<UserDocument, '_id' | 'email' | 'status' | 'statusUntil'>;
const statusProjection = { _id: 1, email: 1, status: 1, statusUntil: 1 } as const;

export function findPasswordRecoveryAccount(email: string) {
  return usersCollection().findOne<RecoveryAccount>(
    { email: normalizeEmail(email), password: { $type: 'string' } },
    { projection: statusProjection }
  );
}

export function findPasswordRecoveryAccountByHash(hash: string) {
  return usersCollection().findOne<RecoveryAccount>(
    {
      'passwordReset.hash': hash,
      'passwordReset.expiresAt': { $gt: new Date() },
      password: { $type: 'string' },
    },
    { projection: statusProjection }
  );
}

export function issuePasswordRecovery(email: string, hash: string, expiresAt: Date) {
  const now = new Date();
  return usersCollection().findOneAndUpdate(
    {
      email: normalizeEmail(email),
      ...activePasswordAccount,
      $or: [
        { 'passwordReset.requestedAt': { $lte: new Date(now.getTime() - 60_000) } },
        { passwordReset: { $exists: false } },
      ],
    },
    { $set: { passwordReset: { hash, expiresAt, requestedAt: now }, updatedAt: now } },
    { returnDocument: 'after', projection: { email: 1 } }
  );
}

export async function clearPasswordRecovery(userId: ObjectId, hash: string) {
  await usersCollection().updateOne(
    { _id: userId, 'passwordReset.hash': hash },
    { $unset: { passwordReset: '' } }
  );
}

export async function consumePasswordRecovery(hash: string, plain: string) {
  const password = await hashPassword(plain);
  return usersCollection().findOneAndUpdate(
    {
      'passwordReset.hash': hash,
      'passwordReset.expiresAt': { $gt: new Date() },
      ...activePasswordAccount,
    },
    {
      $set: { password, updatedAt: new Date() },
      $inc: { sessionVersion: 1 },
      $unset: { passwordReset: '' },
    },
    { returnDocument: 'after', projection: { password: 0, passwordReset: 0 } }
  );
}
