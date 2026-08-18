import bcrypt from 'bcryptjs';
import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import { z } from 'zod';

import { getDb } from '../config/db';
import { toObjectId } from './object-id';

const SALT_ROUNDS = 12;

export const USERS_COLLECTION = 'users';

/** Identity sources. `local` is email + password; the rest arrive via OAuth. */
export const AUTH_PROVIDERS = ['local', 'google', 'facebook', 'tiktok'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/**
 * The document as stored. Optional fields are written as explicit nulls rather
 * than left absent, so a document read back has one shape rather than two and
 * callers never have to distinguish "no avatar" from "field never set".
 */
export type UserDocument = {
  _id: ObjectId;
  email: string;
  /** Bcrypt hash. Null on OAuth accounts — there is no password to store. */
  password: string | null;
  name: string | null;
  provider: AuthProvider;
  /** The provider's own stable user id (Google `sub`, TikTok `open_id`, …). */
  providerId: string | null;
  avatarUrl: string | null;
  /** True when the provider vouches for the address, or after our own verify. */
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * What every read returns except the one credential check.
 *
 * Mongoose kept the hash out of results with `select: false`, which made
 * omission the default and inclusion an opt-in. The driver has no equivalent, so
 * the safe default is gone and forgetting a projection now leaks the hash rather
 * than merely inconveniencing the caller. That inversion is the reason this type
 * exists, the reason the projection below is defined once, and the reason the
 * only function that returns the hash says so in its name.
 */
export type User = Omit<UserDocument, 'password'>;

/** Shape safe to serialise to a client — never includes the hash. */
export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  provider: AuthProvider;
  avatarUrl: string | null;
  emailVerified: boolean;
};

/**
 * Replaces the schema's `required`, `enum`, `lowercase` and `trim` rules. Route
 * handlers already validate their own payloads; this is the last gate before a
 * write, so an internal caller cannot insert a document the rest of the code
 * assumes cannot exist.
 */
export const userAttrsSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z.string().min(1).nullish(),
    name: z.string().trim().min(1).nullish(),
    provider: z.enum(AUTH_PROVIDERS).default('local'),
    providerId: z.string().min(1).nullish(),
    avatarUrl: z.string().min(1).nullish(),
    emailVerified: z.boolean().default(false),
  })
  .superRefine((attrs, ctx) => {
    // Required only for local accounts. An OAuth user never picks a password,
    // and forcing a random one just creates an unusable credential.
    if (attrs.provider === 'local' && !attrs.password) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'Password is required' });
    }
  });

export type UserAttrs = z.input<typeof userAttrsSchema>;

/**
 * Index names are left to the driver, which derives them from the key pattern
 * exactly as Mongoose did. That keeps `createIndexes` a no-op against the
 * indexes already on the collection instead of a same-keys-different-name
 * conflict.
 */
export const USER_INDEXES: IndexDescription[] = [
  { key: { email: 1 }, unique: true },
  // Looking a returning OAuth user up by (provider, providerId) is the hot path
  // on every social login. Sparse so the millions of local accounts, which have
  // no providerId, don't all collide on null.
  { key: { provider: 1, providerId: 1 }, unique: true, sparse: true },
];

export function usersCollection(): Collection<UserDocument> {
  return getDb().collection<UserDocument>(USERS_COLLECTION);
}

/** The one place the hash is excluded. See the note on `User`. */
const WITHOUT_PASSWORD = { password: 0 } as const;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Replaces the `pre('save')` hook; the only place a password is hashed. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Validates, applies defaults, hashes the password, and stamps the timestamps
 * Mongoose's `timestamps: true` used to add.
 *
 * The `_id` is generated here rather than left to the server so the inserted
 * document can be returned without a second round trip.
 */
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
    createdAt: now,
    updatedAt: now,
  };

  await usersCollection().insertOne(doc);

  const { password: _hash, ...user } = doc;
  return user;
}

export function findUserById(id: string | ObjectId): Promise<User | null> {
  return usersCollection().findOne<User>({ _id: toObjectId(id) }, { projection: WITHOUT_PASSWORD });
}

export function findUserByEmail(email: string): Promise<User | null> {
  return usersCollection().findOne<User>(
    { email: normalizeEmail(email) },
    { projection: WITHOUT_PASSWORD }
  );
}

export function findUserByProviderId(
  provider: AuthProvider,
  providerId: string
): Promise<User | null> {
  return usersCollection().findOne<User>(
    { provider, providerId },
    { projection: WITHOUT_PASSWORD }
  );
}

/**
 * The only read that returns the hash — hence the name. Callers pass the result
 * straight to `comparePassword` and nothing else.
 */
export function findUserWithPasswordByEmail(email: string): Promise<UserDocument | null> {
  return usersCollection().findOne({ email: normalizeEmail(email) });
}

/** Fields an update is allowed to touch. Email and password are not among them. */
export type UserPatch = Partial<
  Pick<UserDocument, 'name' | 'avatarUrl' | 'provider' | 'providerId' | 'emailVerified'>
>;

/**
 * Returns the updated document, or null when no user has that id. An empty patch
 * is a no-op read rather than a write, so callers can build a patch
 * conditionally without checking whether it ended up empty — which is what
 * `isModified()` used to do for them.
 */
export async function updateUser(id: string | ObjectId, patch: UserPatch): Promise<User | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return findUserById(_id);

  // The projection keeps the hash out at runtime; `findOneAndUpdate` has no
  // generic to say so, and the wider return type is assignable to the narrower
  // one, so no cast is needed to state it here.
  const updated: User | null = await usersCollection().findOneAndUpdate(
    { _id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after', projection: WITHOUT_PASSWORD }
  );

  return updated;
}

/**
 * Always false for OAuth accounts, whose stored hash is null. Returning false
 * rather than throwing means a password login attempt against a Google-only
 * account is just a failed login, indistinguishable from a wrong password — no
 * account enumeration.
 */
export function comparePassword(hash: string | null, candidate: string): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(candidate, hash);
}

export function toPublicUser(user: User | UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name ?? null,
    provider: user.provider,
    avatarUrl: user.avatarUrl ?? null,
    emailVerified: user.emailVerified,
  };
}
