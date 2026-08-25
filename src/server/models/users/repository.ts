import { ADMIN_PAGE_SIZE } from '@shared/limits';
import type { AdminUserSort } from '@shared/schemas';
import { ObjectId, type Collection, type Filter, type Sort } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { hashPassword } from './security';
import {
  USERS_COLLECTION,
  type AuthProvider,
  type User,
  type UserDocument,
  type UserPatch,
  type UserRole,
  type UserStatus,
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

/**
 * Turns a search box into something safe to hand a regex engine.
 *
 * Without this, a `q` of `.*` is a filter that matches every account and `(`
 * is an unterminated group the driver rejects — a search field is user input,
 * and the query language it lands in is not one it should be able to write.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type FindUsersOptions = {
  /** Matches an email from the start, or a name anywhere in it. */
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  provider?: AuthProvider;
  sort?: AdminUserSort;
  page?: number;
  limit?: number;
};

const USER_SORTS: Record<AdminUserSort, Sort> = {
  // The default, and the one the `{ role: 1, createdAt: -1 }` index serves.
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  email: { email: 1 },
};

/**
 * One page of accounts for the admin list, and the total behind it.
 *
 * Always paginated and always without the password, since this is the one read
 * that deliberately returns other people's accounts.
 *
 * The search is honest about what it is: emails are stored normalised, so the
 * email arm is an anchored match on a lowercase term and the name arm is a
 * case-insensitive substring, which is a scan. That is a fair trade for an admin
 * search box on this collection — if it ever stops being one, the fix is a text
 * index rather than a slower page.
 */
export async function findUsersPaginated(
  options: FindUsersOptions = {}
): Promise<{ items: User[]; total: number }> {
  const { q, role, status, provider, sort = 'newest', page = 1, limit = ADMIN_PAGE_SIZE } = options;

  const filter: Filter<UserDocument> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (provider) filter.provider = provider;

  const term = q?.trim();
  if (term) {
    const escaped = escapeRegex(term);
    filter.$or = [
      { email: { $regex: `^${escaped.toLowerCase()}` } },
      { name: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    usersCollection()
      .find<User>(filter, { projection: WITHOUT_PASSWORD })
      .sort(USER_SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    usersCollection().countDocuments(filter),
  ]);

  return { items, total };
}

/**
 * How many accounts sit in each value of one field, for the breakdown charts.
 *
 * Narrow on purpose: the caller names the field, but only from a list the type
 * allows, so a dimension arriving from a query string cannot turn into a group
 * on anything the dashboard was not built to draw.
 */
export async function countUsersBy(
  field: 'role' | 'status' | 'provider'
): Promise<Record<string, number>> {
  const rows = await usersCollection()
    .aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ])
    .toArray();

  // A null bucket is a document written before the field existed; the backfill
  // script clears those, and until it runs they are counted as the default.
  return Object.fromEntries(rows.map((row) => [row._id ?? 'unknown', row.count]));
}
