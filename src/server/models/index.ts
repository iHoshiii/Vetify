import type { Db, Document, IndexDescription } from 'mongodb';
import { getDb } from '../config/db';
import { ACTIVITY_EVENTS_COLLECTION, ACTIVITY_EVENT_INDEXES } from './activity-event';
import { ANON_USAGES_COLLECTION, ANON_USAGE_INDEXES } from './AnonUsage';
import { AUDIT_LOGS_COLLECTION, AUDIT_LOG_INDEXES } from './audit-log';
import { BLOGS_COLLECTION, BLOG_INDEXES } from './blogs';
import { PETS_COLLECTION, PET_INDEXES } from './pets/constants';
import {
  PROFESSIONAL_CAPTURES_COLLECTION,
  PROFESSIONAL_CAPTURE_INDEXES,
} from './professional-captures';
import {
  PROFESSIONAL_INQUIRIES_COLLECTION,
  PROFESSIONAL_INQUIRY_INDEXES,
} from './professional-inquiries';
import { PROFESSIONALS_COLLECTION, PROFESSIONAL_INDEXES } from './professionals';
import { REFRESH_TOKENS_COLLECTION, REFRESH_TOKEN_INDEXES } from './refresh-token';
import { USERS_COLLECTION, USER_INDEXES } from './users';

export { isValidObjectId, toObjectId } from './object-id';

export { dailyCountStages, type DailyCount } from './daily-count';

export { escapeRegex } from './text-search';

export {
  ACTIVITY_EVENTS_COLLECTION,
  ACTIVITY_EVENT_INDEXES,
  ACTIVITY_RETENTION_DAYS,
  ACTIVITY_TYPES,
  activityEventsCollection,
  countActivityBetween,
  countActivityPerDay,
  flushActivity,
  recordActivity,
  type ActivityEventDocument,
  type ActivityType,
  type RecordActivityInput,
} from './activity-event';

export {
  ANON_QUOTA_WINDOW_MS,
  ANON_USAGES_COLLECTION,
  ANON_USAGE_INDEXES,
  anonUsagesCollection,
  type AnonUsageDocument,
} from './AnonUsage';

export {
  AUDIT_ACTIONS,
  AUDIT_LOGS_COLLECTION,
  AUDIT_LOG_INDEXES,
  AUDIT_TARGET_TYPES,
  auditLogsCollection,
  findAuditEntries,
  recordAudit,
  toAuditEntry,
  toAuditPage,
  type AuditAction,
  type AuditEntry,
  type AuditLogDocument,
  type AuditPage,
  type AuditTargetType,
  type FindAuditOptions,
  type RecordAuditInput,
} from './audit-log';

export {
  BLOGS_COLLECTION,
  BLOG_INDEXES,
  BLOG_PUBLIC_STATUSES,
  BLOG_SEARCH_INDEX,
  BLOG_STATUSES,
  blogAttrsSchema,
  blogsCollection,
  countBlogsByStatus,
  countBlogsBetween,
  countBlogsPerDay,
  deleteBlog,
  findBlogById,
  findBlogBySlug,
  findBlogs,
  insertBlog,
  slugify,
  toAdminBlogDetail,
  toAdminBlogPage,
  toAdminBlogSummary,
  toBlogPage,
  toBlogSummary,
  toPublicBlog,
  updateBlog,
  type AdminBlogAuthor,
  type AdminBlogDetail,
  type AdminBlogModeration,
  type AdminBlogPage,
  type AdminBlogSummary,
  type BlogAttrs,
  type BlogDocument,
  type BlogModeration,
  type BlogPage,
  type BlogPatch,
  type BlogStatus,
  type BlogSummary,
  type FindBlogsOptions,
  type PublicBlog,
} from './blogs';

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
  PROFESSIONAL_CAPTURES_COLLECTION,
  PROFESSIONAL_CAPTURE_INDEXES,
  PROFESSIONAL_PHOTO_KINDS,
  deleteProfessionalCaptures,
  findCaptureIds,
  findCaptureIdsForApplications,
  findProfessionalCapture,
  insertProfessionalCaptures,
  professionalCapturesCollection,
  type CaptureInput,
  type ProfessionalCaptureDocument,
  type ProfessionalCaptureIds,
  type ProfessionalPhotoKind,
} from './professional-captures';

export {
  PROFESSIONAL_INQUIRIES_COLLECTION,
  PROFESSIONAL_INQUIRY_INDEXES,
  PROFESSIONAL_INQUIRY_OPEN_STATUSES,
  PROFESSIONAL_INQUIRY_STATUSES,
  countInquiriesByStatus,
  findProfessionalInquiries,
  findProfessionalInquiryById,
  findProfessionalInquiryByToken,
  insertProfessionalInquiry,
  isDuplicateInquiry,
  isInviteLive,
  professionalInquiriesCollection,
  professionalInquiryAttrsSchema,
  toAdminInquiry,
  toAdminInquiryPage,
  toInviteSummary,
  updateProfessionalInquiry,
  type AdminInquiry,
  type AdminInquiryPage,
  type FindInquiriesOptions,
  type InviteSummary,
  type ProfessionalInquiryAttrs,
  type ProfessionalInquiryDocument,
  type ProfessionalInquiryPatch,
  type ProfessionalInquiryStatus,
} from './professional-inquiries';

export {
  PROFESSIONALS_COLLECTION,
  PROFESSIONAL_INDEXES,
  PROFESSIONAL_PUBLIC_STATUSES,
  PROFESSIONAL_STATUSES,
  countProfessionalsByStatus,
  findProfessionalById,
  findProfessionalByUser,
  findProfessionals,
  findVerifiedProfessionals,
  insertProfessional,
  isDuplicateApplication,
  isDuplicateLicense,
  professionalAttrsSchema,
  professionalsCollection,
  toAdminProfessional,
  toAdminProfessionalPage,
  toOwnProfessional,
  toProfessionalPage,
  toPublicProfessional,
  updateProfessional,
  type AdminApplicant,
  type AdminProfessional,
  type AdminProfessionalPage,
  type FindProfessionalsOptions,
  type FindVerifiedOptions,
  type OwnProfessional,
  type ProfessionalAttrs,
  type ProfessionalDocument,
  type ProfessionalPage,
  type ProfessionalPatch,
  type ProfessionalStatus,
  type ProfessionalWithAccount,
  type PublicProfessional,
} from './professionals';

export {
  REFRESH_TOKENS_COLLECTION,
  REFRESH_TOKEN_INDEXES,
  findRefreshTokenByHash,
  findRefreshTokenWithOwner,
  hashToken,
  insertRefreshToken,
  isRefreshTokenActive,
  refreshTokensCollection,
  revokeAllRefreshTokensForUser,
  revokeRefreshTokenByHash,
  type RefreshTokenDocument,
  type RefreshTokenWithOwner,
} from './refresh-token';

export {
  AUTH_PROVIDERS,
  USER_INDEXES,
  USER_ROLES,
  USER_STATUSES,
  USERS_COLLECTION,
  comparePassword,
  countActiveAdmins,
  countUsersBy,
  findUserByEmail,
  findUserById,
  findUserByProviderId,
  findUsersByIds,
  findUsersPaginated,
  findUserWithPasswordByEmail,
  hashPassword,
  insertUser,
  normalizeEmail,
  toAdminUser,
  toAdminUserPage,
  toPublicUser,
  updateUser,
  userAttrsSchema,
  usersCollection,
  type AdminUser,
  type AdminUserPage,
  type AuthProvider,
  type FindUsersOptions,
  type PublicUser,
  type User,
  type UserAttrs,
  type UserDocument,
  type UserPatch,
  type UserRole,
  type UserStatus,
} from './users';

// list of collections and their corresponding indexes to be created in the database
const INDEX_PLAN: Array<{ collection: string; indexes: IndexDescription[] }> = [
  { collection: USERS_COLLECTION, indexes: USER_INDEXES },
  { collection: PETS_COLLECTION, indexes: PET_INDEXES },
  { collection: REFRESH_TOKENS_COLLECTION, indexes: REFRESH_TOKEN_INDEXES },
  { collection: ANON_USAGES_COLLECTION, indexes: ANON_USAGE_INDEXES },
  { collection: ACTIVITY_EVENTS_COLLECTION, indexes: ACTIVITY_EVENT_INDEXES },
  { collection: AUDIT_LOGS_COLLECTION, indexes: AUDIT_LOG_INDEXES },
  { collection: BLOGS_COLLECTION, indexes: BLOG_INDEXES },
  { collection: PROFESSIONALS_COLLECTION, indexes: PROFESSIONAL_INDEXES },
  { collection: PROFESSIONAL_INQUIRIES_COLLECTION, indexes: PROFESSIONAL_INQUIRY_INDEXES },
  { collection: PROFESSIONAL_CAPTURES_COLLECTION, indexes: PROFESSIONAL_CAPTURE_INDEXES },
];

// Mongo refuses to redefine an index whose key already exists with different
// options (85) or whose name is taken by a different key (86).
const INDEX_OPTIONS_CONFLICT = 85;
const INDEX_KEY_SPECS_CONFLICT = 86;

function conflictsWithExistingIndex(err: unknown): boolean {
  const code = (err as { code?: number }).code;
  return code === INDEX_OPTIONS_CONFLICT || code === INDEX_KEY_SPECS_CONFLICT;
}

function sameKey(a: Document, b: IndexDescription['key']): boolean {
  const left = Object.entries(a);
  const right = Object.entries(b);
  if (left.length !== right.length) return false;
  // Field order is part of a compound index's identity, so compare positionally.
  return left.every(([field, dir], i) => right[i][0] === field && right[i][1] === dir);
}

/**
 * Creates one index, replacing an older definition of the same key when the
 * options have changed.
 *
 * A deployment that already ran an earlier version has the previous definition
 * sitting in the collection, and `createIndexes` will not quietly upgrade it — it
 * errors, which used to take out every remaining index in the same call. Dropping
 * the stale one first is the only way the change reaches an existing database.
 */
async function ensureIndex(db: Db, collection: string, index: IndexDescription): Promise<void> {
  try {
    await db.collection(collection).createIndexes([index]);
    return;
  } catch (err) {
    if (!conflictsWithExistingIndex(err)) throw err;
  }

  const existing = await db.collection(collection).indexes();
  const stale = existing.find(
    (candidate) => candidate.name !== '_id_' && sameKey(candidate.key, index.key)
  );

  if (!stale?.name)
    throw new Error(`Index conflict on ${collection} that no existing index explains`);

  console.warn(`[db] replacing stale index ${collection}.${stale.name} — its options changed`);
  await db.collection(collection).dropIndex(stale.name);
  await db.collection(collection).createIndexes([index]);
}

// get the database
export async function ensureIndexes(): Promise<void> {
  const db = getDb();
  // create indexes for each collection based on the defined INDEX_PLAN, one at a
  // time so a conflict on one does not abandon the rest
  for (const { collection, indexes } of INDEX_PLAN) {
    for (const index of indexes) {
      await ensureIndex(db, collection, index);
    }
  }
}
