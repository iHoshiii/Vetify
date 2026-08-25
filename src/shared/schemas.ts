import { z } from 'zod';

import {
  ADMIN_PAGE_SIZE,
  ADMIN_PAGE_SIZE_MAX,
  BLOG_MAX_TAGS,
  BLOG_PAGE_SIZE,
  BLOG_PAGE_SIZE_MAX,
  METRIC_MAX_DAYS,
  METRIC_WINDOW_DAYS,
  MODERATION_REASON_MAX,
  MODERATION_REASON_MIN,
  PROFESSIONAL_BIO_MAX,
  PROFESSIONAL_BIO_MIN,
  PROFESSIONAL_MAX_CREDENTIALS,
  PROFESSIONAL_MAX_SPECIALTIES,
  PROFESSIONAL_PAGE_SIZE,
  PROFESSIONAL_PAGE_SIZE_MAX,
} from './limits';

const allowedChatModels = [
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
] as const;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().trim().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .trim()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[0-9]/, 'Password must include a number')
      .regex(/[^A-Za-z0-9]/, 'Password must include a special character'),
    confirmPassword: z.string().trim().min(1, 'Please confirm your password'),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }
  });

export const chatRequestSchema = z
  .object({
    message: z.string().trim().min(1, 'Message cannot be empty.'),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant', 'model']),
          content: z.string().trim().min(1, 'Conversation history entries must include content'),
        })
      )
      .default([]),
    session_id: z.string().trim().default('anonymous'),
    model: z.string().trim().default('gemini-3.5-flash'),
  })
  .transform((value) => ({
    ...value,
    model: allowedChatModels.includes(value.model as (typeof allowedChatModels)[number])
      ? value.model
      : 'gemini-3.5-flash',
  }));

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

/** Post-parse chat payload: defaults applied, model normalised. */
export type ChatRequest = z.output<typeof chatRequestSchema>;

/* -------------------------------------------------------------------------- *
 * Account vocabulary
 *
 * These lists live here rather than in the server's user model because both
 * halves need the same values: the server validates against them, and the admin
 * dashboard renders them as filter options and badges. Two copies would mean a
 * role the server accepts and the UI cannot draw.
 * -------------------------------------------------------------------------- */

/** What a user may do. 'professional' is a vet whose licence has been verified,
 * 'admin' runs the dashboard. */
export const USER_ROLES = ['user', 'professional', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Account standing. 'suspended' is meant to be lifted again, 'banned' is not. */
export const USER_STATUSES = ['active', 'suspended', 'banned'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** How the account signs in. */
export const AUTH_PROVIDERS = ['local', 'google', 'facebook', 'tiktok'] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/**
 * Every privileged action the audit log names, and what it was done to.
 *
 * A closed list because this is the vocabulary the audit screen filters on: a
 * free-form string would let one caller write 'blog.remove' and another
 * 'blog.removed', and neither would appear under the other's filter.
 */
export const AUDIT_ACTIONS = [
  'blog.hidden',
  'blog.removed',
  'blog.restored',
  'professional.rejected',
  'professional.suspended',
  'professional.verified',
  'user.role.changed',
  'user.status.changed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_TARGET_TYPES = ['blog', 'professional', 'user'] as const;
export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/**
 * Statuses an author may set on their own post.
 *
 * A deliberate subset of the four a blog document can hold: 'hidden' and
 * 'removed' are moderation states, and letting an author write them would let
 * them both hide their own work in a way the dashboard cannot explain and — far
 * worse — patch their way back out of a takedown.
 */
export const BLOG_AUTHOR_STATUSES = ['draft', 'published'] as const;
export type BlogAuthorStatus = (typeof BLOG_AUTHOR_STATUSES)[number];

/**
 * The statuses only a moderator may set, and the full set a post can hold.
 *
 * The full list is derived from the author's rather than written out again, which
 * is what makes the note above ("a deliberate subset") true by construction: a
 * status added here cannot go missing from one of the two lists.
 */
export const BLOG_MODERATION_STATUSES = ['hidden', 'removed'] as const;
export const BLOG_STATUSES = [...BLOG_AUTHOR_STATUSES, ...BLOG_MODERATION_STATUSES] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

/** Defined once so create and update cannot drift apart on the same field. */
const blogFields = {
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(160, 'Title is too long'),
  excerpt: z
    .string()
    .trim()
    .min(10, 'Excerpt must be at least 10 characters')
    .max(320, 'Excerpt is too long'),
  body: z.string().trim().min(50, 'A post needs at least 50 characters'),
  coverUrl: z.string().trim().url('Cover image must be a valid URL').nullish(),
  tags: z
    .array(z.string().trim().min(1, 'A tag cannot be empty').max(24, 'That tag is too long'))
    .max(BLOG_MAX_TAGS, `Up to ${BLOG_MAX_TAGS} tags`)
    // Lowercased and deduplicated here rather than at the query, so 'Dogs' and
    // 'dogs' are one filterable tag instead of two that each miss half the posts.
    .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))]),
};

export const blogCreateSchema = z.object({
  ...blogFields,
  tags: blogFields.tags.default([]),
  // Drafts by default: publishing is a decision, and a schema default is the
  // wrong place to make it on the author's behalf.
  status: z.enum(BLOG_AUTHOR_STATUSES).default('draft'),
});

export const blogUpdateSchema = z
  .object({
    title: blogFields.title.optional(),
    excerpt: blogFields.excerpt.optional(),
    body: blogFields.body.optional(),
    coverUrl: blogFields.coverUrl.optional(),
    tags: blogFields.tags.optional(),
    status: z.enum(BLOG_AUTHOR_STATUSES).optional(),
  })
  // An empty PATCH would otherwise bump updatedAt and report success for having
  // done nothing.
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'Include at least one field to update',
  });

export const blogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page starts at 1').default(1),
  // Capped rather than clamped: silently returning 50 for a request that asked
  // for 5000 hides the limit from whoever is writing against the API.
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(BLOG_PAGE_SIZE_MAX, `Ask for at most ${BLOG_PAGE_SIZE_MAX} posts per page`)
    .default(BLOG_PAGE_SIZE),
  tag: z.string().trim().toLowerCase().min(1).optional(),
  q: z.string().trim().min(2, 'Search for at least 2 characters').max(80).optional(),
});

export type BlogCreateInput = z.input<typeof blogCreateSchema>;
export type BlogCreate = z.output<typeof blogCreateSchema>;
export type BlogUpdateInput = z.input<typeof blogUpdateSchema>;
export type BlogUpdate = z.output<typeof blogUpdateSchema>;
/** Post-parse list query: page and limit coerced from strings and defaulted. */
export type BlogListQuery = z.output<typeof blogListQuerySchema>;

/**
 * What an applicant fills in. Defined once so the form and the validator behind
 * it cannot drift, and shaped to the eligibility list the professionals page
 * already publishes: a licence, proof of it, active practice, and an
 * introduction someone can actually read.
 */
const professionalFields = {
  licenseNumber: z
    .string()
    .trim()
    .min(3, 'License number must be at least 3 characters')
    .max(60, 'That license number is too long')
    // Uniqueness is enforced on this value, so it is normalised at the edge:
    // 'vet 1234' and 'VET  1234' are one licence, not two applications a
    // reviewer has to spot as duplicates.
    .transform((value) => value.toUpperCase().replace(/\s+/g, ' ')),
  licenseAuthority: z
    .string()
    .trim()
    .min(2, 'Name the board or council that issued the license')
    .max(120, 'That authority name is too long')
    .transform((value) => value.replace(/\s+/g, ' ')),
  credentialUrls: z
    .array(z.string().trim().url('Each credential must be a valid URL'))
    .min(1, 'Link at least one credential we can verify')
    .max(PROFESSIONAL_MAX_CREDENTIALS, `Up to ${PROFESSIONAL_MAX_CREDENTIALS} credential links`),
  specialties: z
    .array(
      z.string().trim().min(2, 'A specialty cannot be empty').max(40, 'That specialty is too long')
    )
    .max(PROFESSIONAL_MAX_SPECIALTIES, `Up to ${PROFESSIONAL_MAX_SPECIALTIES} specialties`)
    // Lowercased and deduplicated for the reason blog tags are: the directory
    // filters on this field, and 'Surgery' must not hide the surgeons.
    .transform((specialties) => [...new Set(specialties.map((one) => one.toLowerCase()))]),
  clinicName: z
    .string()
    .trim()
    .min(2, 'Where do you practise?')
    .max(140, 'That clinic name is too long'),
  clinicAddress: z
    .string()
    .trim()
    .min(8, 'Give the full clinic address')
    .max(240, 'That address is too long'),
  bio: z
    .string()
    .trim()
    .min(PROFESSIONAL_BIO_MIN, `Write at least ${PROFESSIONAL_BIO_MIN} characters`)
    .max(PROFESSIONAL_BIO_MAX, 'That introduction is too long'),
  yearsExperience: z.coerce
    .number()
    .int('Years of experience must be a whole number')
    .min(0, 'Years of experience cannot be negative')
    .max(70, 'That is more years than a career holds'),
};

export const professionalApplySchema = z.object({
  ...professionalFields,
  specialties: professionalFields.specialties.default([]),
  // The site promises every listed vet has consented to a background check, so
  // the application is the record of that consent. A boolean with a default
  // would quietly answer for the applicant; an unticked box has to fail.
  backgroundCheckConsent: z.boolean().refine((given) => given, {
    message: 'Consent to a background check is required',
  }),
});

/**
 * Where an application sits.
 *
 * 'pending' is the only status an applicant can create. The other three are a
 * reviewer's verdict: 'verified' is a listing in the directory and the
 * 'professional' role, 'rejected' is a decision with a reason attached, and
 * 'suspended' pulls an already-verified vet without pretending the verification
 * never happened.
 */
export const PROFESSIONAL_STATUSES = ['pending', 'verified', 'rejected', 'suspended'] as const;
export type ProfessionalStatus = (typeof PROFESSIONAL_STATUSES)[number];

/**
 * Why a moderator did what they did, in their own words.
 *
 * Required wherever the action takes something away — a rejection, a takedown, a
 * ban — because it is the only thing the person on the other end is told, and the
 * only thing the audit log can show for the decision months later. Defined once
 * so the blog, user and professional routes cannot disagree on how much of an
 * explanation counts as one.
 */
export const moderationReason = z
  .string()
  .trim()
  .min(MODERATION_REASON_MIN, `Say why in at least ${MODERATION_REASON_MIN} characters`)
  .max(MODERATION_REASON_MAX, 'That reason is too long');

/**
 * The same field where an explanation is welcome but not owed: hiding a post is
 * reversible, and restoring one needs no defence. An empty box means "no note"
 * rather than a validation error, because an empty box is what a form sends.
 */
export const moderationNote = z
  .string()
  .trim()
  .max(MODERATION_REASON_MAX, 'That reason is too long')
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || value.length >= MODERATION_REASON_MIN, {
    message: `Say why in at least ${MODERATION_REASON_MIN} characters`,
  });

/** A reviewer turning an application down or pulling a listing. */
export const professionalRejectSchema = z.object({ reason: moderationReason });

/**
 * A reviewer approving one.
 *
 * The note is optional, because an approval owes nobody an explanation and
 * "licence checked" is what a required box would actually collect. The audit
 * entry records the verdict either way.
 */
export const professionalVerifySchema = z.object({ reason: moderationNote });

export const professionalListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page starts at 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PROFESSIONAL_PAGE_SIZE_MAX, `Ask for at most ${PROFESSIONAL_PAGE_SIZE_MAX} per page`)
    .default(PROFESSIONAL_PAGE_SIZE),
  specialty: z.string().trim().toLowerCase().min(1).optional(),
});

/** Pre-parse: what the form holds, before trimming and normalising. */
export type ProfessionalApplyInput = z.input<typeof professionalApplySchema>;
/** Post-parse: what reaches the repository, licence and specialties normalised. */
export type ProfessionalApply = z.output<typeof professionalApplySchema>;
export type ProfessionalReject = z.output<typeof professionalRejectSchema>;
export type ProfessionalVerify = z.output<typeof professionalVerifySchema>;
/** Post-parse directory query: page and limit coerced from strings and defaulted. */
export type ProfessionalListQuery = z.output<typeof professionalListQuerySchema>;

/* -------------------------------------------------------------------------- *
 * Admin surface
 *
 * Query shapes and mutation bodies for the dashboard, kept beside the public
 * contracts on purpose: the admin blog list is the public list plus a status
 * filter, and reading the two next to each other is how they stay that way.
 * -------------------------------------------------------------------------- */

/**
 * An id as it arrives in a URL or a filter: 24 hex characters.
 *
 * Checked in the schema so a mistyped id answers 400 with a field message,
 * instead of reaching the driver and throwing a BSONError that surfaces as
 * something less explicable.
 */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{24}$/i, 'That is not a valid id');

/**
 * The pager every admin list shares. Capped rather than clamped for the reason
 * the public pagers are: quietly returning 20 rows to a request that asked for
 * 5000 hides the limit from whoever is writing against the API.
 */
const adminPageFields = {
  page: z.coerce.number().int().min(1, 'Page starts at 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ADMIN_PAGE_SIZE_MAX, `Ask for at most ${ADMIN_PAGE_SIZE_MAX} rows per page`)
    .default(ADMIN_PAGE_SIZE),
};

/**
 * The moderation list of posts.
 *
 * No status default, unlike the public feed's implicit 'published': moderating
 * means seeing the drafts and the takedowns too, and an admin who wants one
 * status says so.
 */
export const adminBlogListQuerySchema = z.object({
  ...adminPageFields,
  status: z.enum(BLOG_STATUSES).optional(),
  author: objectIdSchema.optional(),
  tag: z.string().trim().toLowerCase().min(1).optional(),
  q: z.string().trim().min(2, 'Search for at least 2 characters').max(80).optional(),
});

/** Hiding is reversible, so its note is optional. A takedown is not, so its
 * reason is required — that string is the whole defence of the decision. */
export const blogHideSchema = z.object({ reason: moderationNote });
export const blogRemoveSchema = z.object({ reason: moderationReason });

/** Sort orders the user list offers. Email is there for the support case: someone
 * writes in, and you are looking for one address rather than browsing. */
export const ADMIN_USER_SORTS = ['newest', 'oldest', 'email'] as const;
export type AdminUserSort = (typeof ADMIN_USER_SORTS)[number];

export const adminUserListQuerySchema = z.object({
  ...adminPageFields,
  q: z.string().trim().min(2, 'Search for at least 2 characters').max(120).optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  provider: z.enum(AUTH_PROVIDERS).optional(),
  sort: z.enum(ADMIN_USER_SORTS).default('newest'),
});

/** Promotion and demotion. The note is optional — the honest answer is often
 * "they asked", and the audit entry records the before and after regardless. */
export const userRoleUpdateSchema = z.object({
  role: z.enum(USER_ROLES),
  reason: moderationNote,
});

/**
 * Suspend, ban, or reinstate.
 *
 * A reason is required for everything except reinstating: taking someone's
 * access away is the decision that has to be explainable months later, and
 * giving it back never needs a defence.
 */
export const userStatusUpdateSchema = z
  .object({
    status: z.enum(USER_STATUSES),
    reason: moderationNote,
  })
  .refine((body) => body.status === 'active' || body.reason !== undefined, {
    path: ['reason'],
    message: 'Say why in at least 10 characters',
  });

/** The review queue. Defaults to 'pending', which is the only reason to open it. */
export const adminProfessionalListQuerySchema = z.object({
  ...adminPageFields,
  status: z.enum(PROFESSIONAL_STATUSES).default('pending'),
  q: z.string().trim().min(2, 'Search for at least 2 characters').max(120).optional(),
});

export const adminAuditListQuerySchema = z.object({
  ...adminPageFields,
  action: z.enum(AUDIT_ACTIONS).optional(),
  targetType: z.enum(AUDIT_TARGET_TYPES).optional(),
  targetId: objectIdSchema.optional(),
  actor: objectIdSchema.optional(),
});

/**
 * The lines the dashboard can plot, named for what they mean rather than for the
 * activity type behind them: 'signups' reads better on a chart legend than
 * 'user.signed_up', and the mapping belongs to the server.
 */
export const METRIC_SERIES = ['signups', 'logins', 'chats', 'blogs', 'applications'] as const;
export type MetricSeries = (typeof METRIC_SERIES)[number];

/** What the breakdown charts can slice by. */
export const BREAKDOWN_DIMENSIONS = [
  'provider',
  'role',
  'userStatus',
  'blogStatus',
  'professionalStatus',
] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

/**
 * How far back a chart may look. Bounded by how long raw events are kept: asking
 * for a year would draw a line that is honest for 90 days and flat zero before
 * it, which reads as "nothing happened" rather than "nothing is recorded".
 */
const daysField = z.coerce
  .number()
  .int()
  .min(1, 'A window is at least one day')
  .max(METRIC_MAX_DAYS, `Charts go back at most ${METRIC_MAX_DAYS} days`)
  .default(METRIC_WINDOW_DAYS);

/** The overview's comparison window: totals now, against the same span before it. */
export const metricsOverviewQuerySchema = z.object({ days: daysField });

export const metricsTimeseriesQuerySchema = z.object({
  metric: z.enum(METRIC_SERIES).default('signups'),
  days: daysField,
});

export const metricsBreakdownQuerySchema = z.object({
  dimension: z.enum(BREAKDOWN_DIMENSIONS),
});

/** Post-parse admin queries: page, limit and days coerced from strings and
 * defaulted, so a handler reads numbers and never re-parses a param. */
export type AdminBlogListQuery = z.output<typeof adminBlogListQuerySchema>;
export type AdminUserListQuery = z.output<typeof adminUserListQuerySchema>;
export type AdminProfessionalListQuery = z.output<typeof adminProfessionalListQuerySchema>;
export type AdminAuditListQuery = z.output<typeof adminAuditListQuerySchema>;
export type MetricsOverviewQuery = z.output<typeof metricsOverviewQuerySchema>;
export type MetricsTimeseriesQuery = z.output<typeof metricsTimeseriesQuerySchema>;
export type MetricsBreakdownQuery = z.output<typeof metricsBreakdownQuerySchema>;

export type BlogHideInput = z.output<typeof blogHideSchema>;
export type BlogRemoveInput = z.output<typeof blogRemoveSchema>;
export type UserRoleUpdateInput = z.output<typeof userRoleUpdateSchema>;
export type UserStatusUpdateInput = z.output<typeof userStatusUpdateSchema>;
