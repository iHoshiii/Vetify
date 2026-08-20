import type { IndexDescription } from 'mongodb';
import { getDb } from '../config/db';
import { ANON_USAGES_COLLECTION, ANON_USAGE_INDEXES } from './AnonUsage';
import { PETS_COLLECTION, PET_INDEXES } from './pets/constants';
import { REFRESH_TOKENS_COLLECTION, REFRESH_TOKEN_INDEXES } from './RefreshToken';
import { USERS_COLLECTION, USER_INDEXES } from './users';

export { isValidObjectId, toObjectId } from './object-id';

export {
  ANON_QUOTA_WINDOW_MS,
  ANON_USAGES_COLLECTION,
  ANON_USAGE_INDEXES,
  anonUsagesCollection,
  type AnonUsageDocument,
} from './AnonUsage';

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
} from './pets';

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
} from './users';

// list of collections and their corresponding indexes to be created in the database
const INDEX_PLAN: Array<{ collection: string; indexes: IndexDescription[] }> = [
  { collection: USERS_COLLECTION, indexes: USER_INDEXES },
  { collection: PETS_COLLECTION, indexes: PET_INDEXES },
  { collection: REFRESH_TOKENS_COLLECTION, indexes: REFRESH_TOKEN_INDEXES },
  { collection: ANON_USAGES_COLLECTION, indexes: ANON_USAGE_INDEXES },
];

// get the database
export async function ensureIndexes(): Promise<void> {
  const db = getDb();
  // crea indexes for each collection based on the defined INDEX_PLAN
  for (const { collection, indexes } of INDEX_PLAN) {
    await db.collection(collection).createIndexes(indexes);
  }
}
