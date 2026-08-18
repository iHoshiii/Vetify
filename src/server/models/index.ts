import type { IndexDescription } from 'mongodb';

import { getDb } from '../config/db';
import { ANON_USAGES_COLLECTION, ANON_USAGE_INDEXES } from './AnonUsage';
import { PETS_COLLECTION, PET_INDEXES } from './Pet';
import { REFRESH_TOKENS_COLLECTION, REFRESH_TOKEN_INDEXES } from './RefreshToken';
import { USERS_COLLECTION, USER_INDEXES } from './User';

export {
  ANON_QUOTA_WINDOW_MS,
  ANON_USAGES_COLLECTION,
  ANON_USAGE_INDEXES,
  anonUsagesCollection,
  type AnonUsageDocument,
} from './AnonUsage';
export { isValidObjectId, toObjectId } from './object-id';
export {
  PETS_COLLECTION,
  PET_AVATAR_DEFAULTS,
  PET_INDEXES,
  insertPet,
  petAttrsSchema,
  petsCollection,
  toPublicPet,
  type PetAttrs,
  type PetAvatar,
  type PetDocument,
  type PublicPet,
} from './Pet';
export {
  REFRESH_TOKENS_COLLECTION,
  REFRESH_TOKEN_INDEXES,
  findRefreshTokenByHash,
  findRefreshTokenWithOwner,
  hashToken,
  insertRefreshToken,
  isRefreshTokenActive,
  refreshTokensCollection,
  revokeRefreshTokenByHash,
  type RefreshTokenDocument,
  type RefreshTokenWithOwner,
} from './RefreshToken';
export {
  AUTH_PROVIDERS,
  USERS_COLLECTION,
  USER_INDEXES,
  comparePassword,
  findUserByEmail,
  findUserById,
  findUserByProviderId,
  findUserWithPasswordByEmail,
  hashPassword,
  insertUser,
  normalizeEmail,
  toPublicUser,
  updateUser,
  userAttrsSchema,
  usersCollection,
  type AuthProvider,
  type PublicUser,
  type User,
  type UserAttrs,
  type UserDocument,
  type UserPatch,
} from './User';

const INDEX_PLAN: Array<{ collection: string; indexes: IndexDescription[] }> = [
  { collection: USERS_COLLECTION, indexes: USER_INDEXES },
  { collection: PETS_COLLECTION, indexes: PET_INDEXES },
  { collection: REFRESH_TOKENS_COLLECTION, indexes: REFRESH_TOKEN_INDEXES },
  { collection: ANON_USAGES_COLLECTION, indexes: ANON_USAGE_INDEXES },
];

/**
 * Creates every index the application relies on.
 *
 * Mongoose built these in the background the first time each model was used,
 * which meant a uniqueness constraint could be missing for the first moments
 * after boot. The driver never creates an index on its own, so this runs once at
 * startup and the process knows whether it succeeded.
 *
 * `createIndexes` is idempotent for specs that already exist, so this is safe to
 * run on every boot.
 */
export async function ensureIndexes(): Promise<void> {
  const db = getDb();

  for (const { collection, indexes } of INDEX_PLAN) {
    await db.collection(collection).createIndexes(indexes);
  }
}
