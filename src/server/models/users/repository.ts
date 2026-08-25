import { ObjectId, type Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { hashPassword } from './security';
import {
  USERS_COLLECTION,
  type AuthProvider,
  type User,
  type UserDocument,
  type UserPatch,
} from './types';
import { normalizeEmail, userAttrsSchema, type UserAttrs } from './validation';

// password is constantly excluded
const WITHOUT_PASSWORD = { password: 0 } as const;

// get the users collection reference from the database connection
export function usersCollection(): Collection<UserDocument> {
  return getDb().collection<UserDocument>(USERS_COLLECTION); // "users"
}

// create and insert a new user document in the database
export async function insertUser(attrs: UserAttrs): Promise<User> {
  const parsed = userAttrsSchema.parse(attrs);
  const now = new Date();

  const doc: UserDocument = {
    _id: new ObjectId(),
    email: parsed.email,
    password: parsed.password ? await hashPassword(parsed.password) : null,
    name: parsed.name ?? null,
    provider: parsed.provider,
    providerId: parsed.providerId ?? null,
    avatarUrl: parsed.avatarUrl ?? null,
    emailVerified: parsed.emailVerified,
    role: parsed.role,
    status: parsed.status,
    statusReason: null,
    statusChangedBy: null,
    statusChangedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // wait for the insertion to complete before returning the user
  // without the password
  await usersCollection().insertOne(doc);

  // set the password value into '_hash' from the document
  const { password: _hash, ...user } = doc;

  // and return the rest of the user's data without the password
  return user;
}

// find the user by ObjectID
// returns the user document without the password field
// accepts a string too, since callers hand over a JWT subject or a route param
export function findUserById(id: string | ObjectId): Promise<User | null> {
  return usersCollection().findOne<User>({ _id: toObjectId(id) }, { projection: WITHOUT_PASSWORD });
}

// find the user by email address
// returns the user document without the password field
export function findUserByEmail(email: string): Promise<User | null> {
  return usersCollection().findOne<User>(
    { email: normalizeEmail(email) },
    { projection: WITHOUT_PASSWORD }
  );
}

// find the user by social login provider and provider user ID
// returns the user document without the password field
export function findUserByProviderId(
  provider: AuthProvider,
  providerId: string
): Promise<User | null> {
  return usersCollection().findOne<User>(
    { provider, providerId },
    { projection: WITHOUT_PASSWORD }
  );
}

// this is only used in server side not in client side
// find the user by email address and return the full document including the password hash
export function findUserWithPasswordByEmail(email: string): Promise<UserDocument | null> {
  return usersCollection().findOne({ email: normalizeEmail(email) });
}

// update user information
// returns the updated user document without the password field
export async function updateUser(id: string | ObjectId, patch: UserPatch): Promise<User | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return findUserById(_id);

  // returns the full document after the update, excluding the password field
  return usersCollection().findOneAndUpdate(
    { _id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after', projection: WITHOUT_PASSWORD }
  );
}

/**
 * How many admins can still sign in. Guards the demote and ban paths so the last
 * one standing cannot remove their own access and leave the dashboard
 * unreachable — recovering from that needs a database shell.
 */
export function countActiveAdmins(): Promise<number> {
  return usersCollection().countDocuments({ role: 'admin', status: 'active' });
}

/**
 * The accounts behind a page of rows, in one query.
 *
 * Every admin list shows who something belongs to — the author of a post, the
 * applicant behind an application — and doing that with a lookup per row is the
 * classic N+1. One `$in` on the `_id` index answers a whole page instead. Ids that
 * match nothing are simply absent from the result: an account can be gone while
 * the post it wrote is still there.
 */
export function findUsersByIds(ids: Array<string | ObjectId>): Promise<User[]> {
  if (ids.length === 0) return Promise.resolve([]);

  return usersCollection()
    .find<User>({ _id: { $in: ids.map(toObjectId) } }, { projection: WITHOUT_PASSWORD })
    .toArray();
}
