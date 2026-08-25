export {
  countActiveAdmins,
  countUsersBy,
  findUserByEmail,
  findUserById,
  findUserByProviderId,
  findUsersByIds,
  findUsersPaginated,
  findUserWithPasswordByEmail,
  insertUser,
  updateUser,
  usersCollection,
  type FindUsersOptions,
} from './repository';

export { comparePassword, hashPassword } from './security';

export { toAdminUser, toAdminUserPage, toPublicUser } from './transform';

export {
  AUTH_PROVIDERS,
  USER_INDEXES,
  USER_ROLES,
  USER_STATUSES,
  USERS_COLLECTION,
  type AdminUser,
  type AdminUserPage,
  type AuthProvider,
  type PublicUser,
  type User,
  type UserDocument,
  type UserPatch,
  type UserRole,
  type UserStatus,
} from './types';

export { normalizeEmail, userAttrsSchema, type UserAttrs } from './validation';
