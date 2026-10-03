import type { ClientSession, Filter, ObjectId } from 'mongodb';
import { usersCollection } from './repository';
import type { User, UserDocument, UserPatch } from './types';

export function restrictAccount(
  id: ObjectId,
  patch: UserPatch,
  options: { filter?: Filter<UserDocument>; session?: ClientSession } = {}
): Promise<User | null> {
  return usersCollection().findOneAndUpdate(
    { ...options.filter, _id: id },
    { $set: { ...patch, updatedAt: new Date() }, $inc: { sessionVersion: 1 } },
    {
      session: options.session,
      returnDocument: 'after',
      projection: { password: 0, passwordReset: 0 },
    }
  );
}
