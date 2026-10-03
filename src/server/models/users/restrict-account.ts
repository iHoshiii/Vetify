import type { ObjectId } from 'mongodb';
import { usersCollection } from './repository';
import type { User, UserPatch } from './types';

export function restrictAccount(id: ObjectId, patch: UserPatch): Promise<User | null> {
  return usersCollection().findOneAndUpdate(
    { _id: id },
    { $set: { ...patch, updatedAt: new Date() }, $inc: { sessionVersion: 1 } },
    { returnDocument: 'after', projection: { password: 0, passwordReset: 0 } }
  );
}
