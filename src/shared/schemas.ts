import { z } from 'zod';

import {
  BLOG_MAX_TAGS,
  BLOG_PAGE_SIZE,
  BLOG_PAGE_SIZE_MAX,
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
 * A reviewer turning an application down or pulling a listing. The reason is
 * required rather than optional: it is the only thing the applicant is told, and
 * the only thing the audit log can show for the decision months later.
 */
export const professionalRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, 'Say why in at least 10 characters')
    .max(500, 'That reason is too long'),
});

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
/** Post-parse directory query: page and limit coerced from strings and defaulted. */
export type ProfessionalListQuery = z.output<typeof professionalListQuerySchema>;
