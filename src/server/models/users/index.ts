export {
  findUserByEmail,
  findUserById,
  findUserByProviderId,
  findUserWithPasswordByEmail,
  insertUser,
  updateUser,
  usersCollection,
} from './repository';

export { comparePassword, hashPassword } from './security';

export { toPublicUser } from './transform';

export {
  AUTH_PROVIDERS,
  USER_INDEXES,
  USERS_COLLECTION,
  type AuthProvider,
  type PublicUser,
  type User,
  type UserDocument,
  type UserPatch,
} from './types';

export { normalizeEmail, userAttrsSchema, type UserAttrs } from './validation';
