import { MongoServerError, type ClientSession, type Filter, type ObjectId } from 'mongodb';
import { getClient, getDb } from '../../config/db';
import { AppError } from '../../utils/AppError';
import { restrictAccount } from './restrict-account';
import { findUserById, updateUser, usersCollection } from './repository';
import type { User, UserDocument, UserPatch } from './types';

const ACTIVE_ADMIN: Filter<UserDocument> = {
  role: 'admin',
  $or: [{ status: 'active' }, { status: { $exists: false } }],
};
const GUARD_ID = 'active-admins';

export function saveProfessionalAccount(
  id: ObjectId,
  patch: Pick<UserPatch, 'name' | 'role'>
): Promise<User | null> {
  const fields: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) fields.name = { $literal: patch.name };
  if (patch.role !== undefined) {
    fields.role = { $cond: [{ $eq: ['$role', 'admin'] }, '$role', { $literal: patch.role }] };
  }
  return usersCollection().findOneAndUpdate({ _id: id }, [{ $set: fields }], {
    returnDocument: 'after',
    projection: { password: 0, passwordReset: 0 },
  });
}

async function writeAccount(
  id: ObjectId,
  patch: UserPatch,
  restrict: boolean,
  filter: Filter<UserDocument>,
  session?: ClientSession
): Promise<User | null> {
  if (restrict) return restrictAccount(id, patch, { filter, session });
  return usersCollection().findOneAndUpdate(
    filter,
    { $set: { ...patch, updatedAt: new Date() } },
    { session, returnDocument: 'after', projection: { password: 0, passwordReset: 0 } }
  );
}

export async function saveAccountChange(
  id: ObjectId,
  patch: UserPatch,
  restrict = false
): Promise<User | null> {
  const removesAdmin =
    (patch.role !== undefined && patch.role !== 'admin') ||
    (patch.status !== undefined && patch.status !== 'active');
  if (!removesAdmin) return updateUser(id, patch);
  const ordinary = await writeAccount(id, patch, restrict, { _id: id, $nor: [ACTIVE_ADMIN] });
  if (ordinary || !(await findUserById(id))) return ordinary;

  const guards = getDb().collection<{ _id: string; revision: number }>('accountguards');
  await guards
    .updateOne({ _id: GUARD_ID }, { $setOnInsert: { revision: 0 } }, { upsert: true })
    .catch((error) => {
      if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    });
  const session = getClient().startSession();
  try {
    return (
      (await session.withTransaction(
        async () => {
          // The shared write prevents snapshot write skew between different admin accounts.
          await guards.updateOne({ _id: GUARD_ID }, { $inc: { revision: 1 } }, { session });
          const target = await usersCollection().findOne({ _id: id }, { session });
          if (!target) return null;
          const activeAdmin = target.role === 'admin' && (target.status ?? 'active') === 'active';
          if (
            activeAdmin &&
            (await usersCollection().countDocuments(ACTIVE_ADMIN, { session })) <= 1
          ) {
            throw AppError.conflict(
              'That is the last active admin. Promote someone else first.',
              'last-admin'
            );
          }
          return writeAccount(id, patch, restrict, { _id: id }, session);
        },
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
      )) ?? null
    );
  } catch (error) {
    if (
      error instanceof MongoServerError &&
      (error.code ?? error.errorResponse.originalError?.code) === 20
    ) {
      throw new AppError(
        503,
        'Admin account changes require a MongoDB replica set.',
        'admin-protection-unavailable'
      );
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
