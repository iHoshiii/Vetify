import { z } from 'zod';

import {
  APPOINTMENT_PAGE_SIZE,
  APPOINTMENT_PAGE_SIZE_MAX,
  APPOINTMENT_REASON_MAX,
  APPOINTMENT_REASON_MIN,
  ADMIN_PAGE_SIZE,
  ADMIN_PAGE_SIZE_MAX,
  BLOG_MAX_TAGS,
  BLOG_PAGE_SIZE,
  BLOG_PAGE_SIZE_MAX,
  METRIC_MAX_DAYS,
  METRIC_WINDOW_DAYS,
  MODERATION_REASON_MAX,
  MODERATION_REASON_MIN,
  PROFESSIONAL_AVAILABILITY_STATUSES,
  PROFESSIONAL_BIO_MAX,
  PROFESSIONAL_BIO_MIN,
  PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES,
  PROFESSIONAL_LOCATION_MAX,
  PROFESSIONAL_LOCATION_MAX_ACCURACY_M,
  PROFESSIONAL_MAX_ADDRESSES,
  PROFESSIONAL_MAX_CREDENTIALS,
  PROFESSIONAL_MAX_RATE_CAP,
  PROFESSIONAL_MAX_SPECIALTIES,
  PROFESSIONAL_MIN_RATE,
  PROFESSIONAL_MOTIVATION_MAX,
  PROFESSIONAL_MOTIVATION_MIN,
  PROFESSIONAL_NEAR_LIMIT,
  PROFESSIONAL_NEAR_LIMIT_MAX,
  PROFESSIONAL_NEAR_RADIUS_KM,
  PROFESSIONAL_NEAR_RADIUS_MAX_KM,
  PROFESSIONAL_PAGE_SIZE,
  PROFESSIONAL_PAGE_SIZE_MAX,
  PROFESSIONAL_PHOTO_MAX_BYTES,
  PROFESSIONAL_PHOTO_MIME,
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
  'blog.approved',
  'blog.hidden',
  'blog.purged',
  'blog.removed',
  'blog.restored',
  'professional.inquiry.auto-declined',
  'professional.inquiry.declined',
  'professional.interview',
  'professional.invited',
  'professional.rejected',
  'professional.suspended',
  'professional.verified',
  'user.role.changed',
  'user.status.changed',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * What an automatic screening verdict can be about.
 *
 * Shared for the same reason the audit actions are: the queue renders these
 * strings as chips, so the list the server may write and the list the dashboard
 * can label have to be one list. Named for what a reviewer would say out loud
 * rather than for any provider's taxonomy.
 */
export const MODERATION_CATEGORIES = [
  'nudity',
  'sexual',
  'slur',
  'hate',
  'harassment',
  'violence',
  'self-harm',
  'illegal',
] as const;
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

/**
 * Where a screened post ended up.
 *
 * 'unavailable' is not a pass: the check could not be completed — an unreachable
 * model, a cover image that would not load — and the post is held on that basis,
 * because the alternative is publishing the one post nobody managed to look at.
 */
export const MODERATION_OUTCOMES = ['clean', 'flagged', 'unavailable'] as const;
export type ModerationOutcome = (typeof MODERATION_OUTCOMES)[number];

/**
 * What a privileged action was done to.
 *
 * 'professional-inquiry' is the enquiry a reviewer invites or turns away, and is
 * its own target rather than folded into 'professional': at that point there is
 * no application yet, so an audit row pointing at a professional id would be
 * pointing at nothing.
 */
export const AUDIT_TARGET_TYPES = ['blog', 'professional', 'professional-inquiry', 'user'] as const;
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
 *
 * 'flagged' is where the automatic screen puts a post it will not let through:
 * held out of the feed, waiting on a human. Distinct from 'hidden', which is an
 * admin's own reversible "not right now" — the difference is who decided, and only
 * one of them has a verdict attached explaining why.
 */
export const BLOG_MODERATION_STATUSES = ['flagged', 'hidden', 'removed'] as const;
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
/**
 * What an applicant fills in on the second form — the one behind the emailed
 * link. Defined once so the form and the validator behind it cannot drift, and
 * shaped to the eligibility list the professionals page already publishes: a
 * licence, proof of it, active practice, and an introduction someone can
 * actually read.
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
  /**
   * Anything else a reviewer might open: a diploma, a board certificate.
   *
   * No longer the proof itself, and no longer required. The licence is
   * photographed front and back during the application now, which is a stronger
   * claim than a link to a document the applicant hosts and can swap out
   * afterwards.
   */
  credentialUrls: z
    .array(z.string().trim().url('Each credential must be a valid URL'))
    .max(PROFESSIONAL_MAX_CREDENTIALS, `Up to ${PROFESSIONAL_MAX_CREDENTIALS} credential links`)
    .default([]),
  specialties: z
    .array(
      z.string().trim().min(2, 'A specialty cannot be empty').max(40, 'That specialty is too long')
    )
    .max(PROFESSIONAL_MAX_SPECIALTIES, `Up to ${PROFESSIONAL_MAX_SPECIALTIES} specialties`)
    // Lowercased and deduplicated for the reason blog tags are: the directory
    // filters on this field, and 'Surgery' must not hide the surgeons.
    .transform((specialties) => [...new Set(specialties.map((one) => one.toLowerCase()))]),
  /**
   * The practice name — owed only when the application carries a clinic address.
   *
   * A vet who works out of their house has no clinic to name, and a required
   * field would collect an invention rather than a fact. The refinement at the
   * bottom of the application schema is what ties the two together.
   */
  clinicName: z
    .string()
    .trim()
    .min(2, 'Where do you practise?')
    .max(140, 'That clinic name is too long')
    .optional(),
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

/**
 * The name on the licence.
 *
 * Kept apart from the account's own name, which its holder can change at will
 * from settings: this one is checked against the PRC register and then frozen, so
 * a later rename cannot quietly detach a listing from the licence it was
 * verified against.
 */
const professionalNameField = z
  .string()
  .trim()
  .min(2, 'Give your full name as the PRC has it')
  .max(120, 'That name is too long')
  .transform((value) => value.replace(/\s+/g, ' '));

/**
 * A contact number for the practice. Optional, and asked for anyway.
 *
 * Deliberately permissive: this is dialled by a person, not parsed by a machine,
 * and a strict pattern would turn a working +63 (32) 000-0000 into a validation
 * error over its punctuation. What it does refuse is prose.
 */
const phoneField = z
  .string()
  .trim()
  .max(32, 'That number is too long')
  .regex(/^[+(]?\d[\d\s()+-]{5,}$/, 'That does not look like a phone number')
  .optional()
  .or(z.literal('').transform(() => undefined));

/**
 * How many bytes a base64 payload stands for, without decoding it.
 *
 * Both halves need the same answer — the browser refuses to send an oversized
 * capture and the server refuses to store one — and neither wants to materialise
 * megabytes of buffer just to measure them. Padding is subtracted rather than
 * ignored, so the number does not read two bytes high on every image.
 */
export function base64ByteLength(value: string): number {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((value.length * 3) / 4) - padding);
}

/** Grace for a device clock that runs fast. */
const CAPTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const CAPTURE_WINDOW_MS = PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES * 60 * 1000;

/**
 * Whether a capture was taken recently enough to have come from a camera.
 *
 * The only half of "photograph it, do not upload it" that a server can check. A
 * caller who skipped the camera still has to state a timestamp, and the honest
 * ones are minutes old while a file off a disk is months old. Corroboration
 * rather than proof, which is part of why the interview stage exists at all.
 */
function isFreshCapture(iso: string): boolean {
  const taken = Date.parse(iso);
  if (Number.isNaN(taken)) return false;

  const now = Date.now();
  return taken <= now + CAPTURE_CLOCK_SKEW_MS && now - taken <= CAPTURE_WINDOW_MS;
}

/**
 * One photograph, as the camera handed it over.
 *
 * Raw base64 rather than a data URL, so nothing downstream has to strip a prefix
 * and no route has to guess which of the two it was handed.
 */
export const capturedPhotoSchema = z
  .object({
    data: z
      .string()
      .trim()
      .min(1, 'Take this photo before submitting')
      .refine((value) => !value.startsWith('data:'), {
        message: 'Send the base64 payload on its own, without the data: prefix',
      }),
    mimeType: z.literal(PROFESSIONAL_PHOTO_MIME, { message: 'A capture has to be a JPEG' }),
    capturedAt: z.string().datetime({ message: 'A capture has to say when it was taken' }),
  })
  .refine((photo) => base64ByteLength(photo.data) <= PROFESSIONAL_PHOTO_MAX_BYTES, {
    message: 'That photo is too large. Retake it and it will be compressed again.',
    path: ['data'],
  })
  .refine((photo) => isFreshCapture(photo.capturedAt), {
    message: `Retake this photo — a capture over ${PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES} minutes old is not accepted.`,
    path: ['capturedAt'],
  });

/**
 * Which address this is.
 *
 * An application needs at least one and may carry both. The home address is what
 * makes a vet locatable when the clinic is somebody else's building; the clinic
 * address is what a pet owner is given. They are not interchangeable, which is
 * why the kind travels with the address instead of being inferred from its
 * position in a list.
 */
export const PROFESSIONAL_ADDRESS_KINDS = ['home', 'clinic'] as const;
export type ProfessionalAddressKind = (typeof PROFESSIONAL_ADDRESS_KINDS)[number];

/**
 * The two halves of a coordinate, as factories.
 *
 * Shared by every shape below that carries a point — a verification fix, a pin a vet
 * dragged, a pet owner's browser reading — so there is one answer to "what is a legal
 * latitude" and one wording when it is not. Factories rather than constants because a
 * Zod schema object is reused by reference, and `.pipe()`-ing one in the query shape
 * would otherwise mutate the one the address shape depends on.
 */
const latitude = () =>
  z.number().min(-90, 'That is not a latitude').max(90, 'That is not a latitude');
const longitude = () =>
  z.number().min(-180, 'That is not a longitude').max(180, 'That is not a longitude');

/**
 * A point the professional put there themselves, by dragging a marker.
 *
 * Not a `liveLocationSchema`, and deliberately not interchangeable with one. A fix is
 * a claim about where a device was on the day somebody applied, and it carries the
 * browser's accuracy estimate because that is what makes the claim readable. A pin
 * carries no accuracy because there is nothing to estimate: it is exactly where its
 * owner said the door is, which is the whole point of asking them to place it.
 */
export const mapPinSchema = z.object({ latitude: latitude(), longitude: longitude() });
export type MapPin = z.output<typeof mapPinSchema>;

/**
 * A reading taken from the device while the applicant stood at the address.
 *
 * `accuracyMeters` is the browser's own estimate, and is required rather than
 * nullable: the Geolocation API always supplies one, so an absent value means the
 * coordinate came from somewhere that is not a device. Capped, because a fix good
 * to half a kilometre describes a neighbourhood, and storing it as a precise pin
 * would be a lie told in a number.
 */
export const liveLocationSchema = z.object({
  latitude: latitude(),
  longitude: longitude(),
  accuracyMeters: z
    .number()
    .positive('An accuracy reading has to be a positive number')
    .max(
      PROFESSIONAL_LOCATION_MAX_ACCURACY_M,
      `That fix is only good to within ${PROFESSIONAL_LOCATION_MAX_ACCURACY_M}m. Step outside and try again.`
    ),
  capturedAt: z.string().datetime({ message: 'A location fix has to say when it was taken' }),
});

const professionalAddressSchema = z
  .object({
    kind: z.enum(PROFESSIONAL_ADDRESS_KINDS),
    line1: z
      .string()
      .trim()
      .min(6, 'Give the street and number')
      .max(PROFESSIONAL_LOCATION_MAX, 'That address line is too long'),
    city: z.string().trim().min(2, 'Which city or municipality?').max(80, 'That city is too long'),
    province: z.string().trim().min(2, 'Which province?').max(80, 'That province is too long'),
    postalCode: z
      .string()
      .trim()
      .max(12, 'That postal code is too long')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    /**
     * Where the device said this was. Required on a home address and welcome on a
     * clinic one: a clinic can be found by its name and its street, and a house
     * on an unnamed road cannot.
     */
    fix: liveLocationSchema.nullish(),
    mapPin: mapPinSchema.nullish(),
  })
  .superRefine((address, ctx) => {
    if (address.kind === 'home' && !address.fix) {
      ctx.addIssue({
        code: 'custom',
        path: ['fix'],
        message: 'A home address needs a live location fix taken at the address.',
      });
    }
  });

const professionalAddressesField = z
  .array(professionalAddressSchema)
  .min(1, 'Give at least one address — your home or your clinic')
  .max(PROFESSIONAL_MAX_ADDRESSES, 'One home address and one clinic address at most')
  .superRefine((addresses, ctx) => {
    const kinds = new Set(addresses.map((address) => address.kind));
    if (kinds.size !== addresses.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Give one home address and one clinic address at most, not two of a kind.',
      });
    }
  });

/**
 * The application itself: everything the second form collects.
 *
 * Every field here is frozen the moment it is submitted. The licence has been
 * checked against a register and the photographs against a face, so an edit would
 * silently detach a verified listing from what was actually verified. That is why
 * no route lets the holder patch any of it, and why the dashboard tells them to
 * contact an admin instead of offering a form.
 */
export const professionalApplySchema = z
  .object({
    ...professionalFields,
    specialties: professionalFields.specialties.default([]),
    /** The name on the licence, checked against the PRC register. */
    fullName: professionalNameField,
    businessPhone: phoneField,
    addresses: professionalAddressesField,
    /** The applicant's face, taken now. */
    portrait: capturedPhotoSchema,
    /** Both sides of the PRC identification card, taken now. */
    licenseFront: capturedPhotoSchema,
    licenseBack: capturedPhotoSchema,
    // The site promises every listed vet has consented to a background check, so
    // the application is the record of that consent. A boolean with a default
    // would quietly answer for the applicant; an unticked box has to fail.
    backgroundCheckConsent: z.boolean().refine((given) => given, {
      message: 'Consent to a background check is required',
    }),
  })
  .superRefine((application, ctx) => {
    const hasClinic = application.addresses.some((address) => address.kind === 'clinic');
    if (hasClinic && !application.clinicName) {
      ctx.addIssue({
        code: 'custom',
        path: ['clinicName'],
        message: 'Name the clinic at that address.',
      });
    }
  });

/**
 * Where an application sits.
 *
 * 'pending' is the only status an applicant can create. The rest are the
 * reviewer's: 'interview' is a scheduled conversation the applicant is waiting
 * on, 'verified' is a listing in the directory and the 'professional' role,
 * 'rejected' is a decision with a reason attached, and 'suspended' pulls an
 * already-verified vet without pretending the verification never happened.
 *
 * 'interview' sits between the submission and the verdict because that is where
 * the process actually pauses: the licence checks out on paper and somebody still
 * has to talk to the applicant. Without it the queue cannot tell an application
 * nobody has opened from one that is booked in for Thursday.
 */
export const PROFESSIONAL_STATUSES = [
  'pending',
  'interview',
  'verified',
  'rejected',
  'suspended',
] as const;
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
  /**
   * One box over the things somebody searches by name: the vet, their clinic, and
   * anywhere in either address.
   */
  q: z.string().trim().min(1).max(120, 'That search is too long').optional(),
  /** At least this many years on the licence. */
  minExperience: z.coerce.number().int().min(0).max(80).optional(),
  /** No more than this per hour. */
  maxRate: z.coerce.number().min(0).max(PROFESSIONAL_MAX_RATE_CAP).optional(),
  /**
   * Only the vets currently taking work.
   *
   * An enum rather than `z.coerce.boolean()`, which turns the string 'false' into
   * true — every non-empty string is truthy — and would quietly do the opposite of
   * what a URL asked for.
   */
  available: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const workHistoryItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, 'Job title must be at least 2 characters').max(100),
  workplace: z.string().trim().min(2, 'Workplace/Clinic must be at least 2 characters').max(140),
  startYear: z.coerce
    .number()
    .int()
    .min(1950, 'Invalid year')
    .max(new Date().getFullYear() + 1),
  endYear: z.coerce
    .number()
    .int()
    .min(1950, 'Invalid year')
    .max(new Date().getFullYear() + 1)
    .nullish(),
  isCurrent: z.boolean().default(false),
  description: z.string().trim().max(1000).optional(),
});
export type WorkHistoryItem = z.output<typeof workHistoryItemSchema>;

export const weeklyScheduleItemSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  enabled: z.boolean().default(true),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm format')
    .default('09:00'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm format')
    .default('17:00'),
});
export type WeeklyScheduleItem = z.output<typeof weeklyScheduleItemSchema>;

/**
 * The settings a verified professional may change about themselves.
 *
 * Every field is optional and absent means "leave it alone", so the tray can send
 * one row's worth of changes instead of resending the whole profile to move a
 * single value. `yearsExperience` is deliberately absent: it was declared on the
 * application and checked against the licence, so changing it is an admin's job.
 */
export const professionalProfileUpdateSchema = z.object({
  availabilityStatus: z.enum(PROFESSIONAL_AVAILABILITY_STATUSES).optional(),
  weeklySchedule: z.array(weeklyScheduleItemSchema).optional(),
  hourlyRate: z.coerce
    .number()
    .min(PROFESSIONAL_MIN_RATE, `Minimum rate is $${PROFESSIONAL_MIN_RATE}`)
    .max(PROFESSIONAL_MAX_RATE_CAP, `Maximum rate allowed is $${PROFESSIONAL_MAX_RATE_CAP}`)
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .url('Profile picture must be a valid URL')
    .or(z.literal(''))
    .nullish()
    .transform((val) => (val === '' ? null : val)),
  workHistory: z.array(workHistoryItemSchema).optional(),
  bookingNotificationMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
});

export type ProfessionalProfileUpdateInput = z.input<typeof professionalProfileUpdateSchema>;
export type ProfessionalProfileUpdate = z.output<typeof professionalProfileUpdateSchema>;

/**
 * One address's answer to "where exactly, and may we show it".
 *
 * Its own shape rather than a field on `professionalProfileUpdateSchema`, because it
 * writes one element of the addresses array rather than a value on the application:
 * the settings patch is a `$set` of whole fields, and this is a positional update
 * naming two sub-fields of the one address it matches. Folding it in would mean
 * bending the one function that owns that patch out of shape.
 *
 * `kind` says which address, so the two are independent — a vet may publish the
 * clinic and keep the house off the map, which is the point of them being separate.
 * `pin` absent leaves the placement alone and `null` clears it, the same distinction
 * the settings patch draws everywhere else.
 */
export const professionalMapUpdateSchema = z.object({
  kind: z.enum(PROFESSIONAL_ADDRESS_KINDS),
  pin: mapPinSchema.nullish(),
  showOnMap: z.boolean().optional(),
});

export type ProfessionalMapUpdateInput = z.input<typeof professionalMapUpdateSchema>;
export type ProfessionalMapUpdate = z.output<typeof professionalMapUpdateSchema>;

/**
 * What a pet owner's browser hands over to be ranked by.
 *
 * Coerced, because it arrives in a query string. No accuracy and no timestamp: the
 * answer is an ordering, and an ordering by a coordinate good to a hundred metres is
 * the same ordering. Nothing stores it.
 */
export const professionalNearQuerySchema = z.object({
  lat: z.coerce.number().pipe(latitude()),
  lng: z.coerce.number().pipe(longitude()),
  radiusKm: z.coerce
    .number()
    .positive('A radius has to be a positive number')
    .max(PROFESSIONAL_NEAR_RADIUS_MAX_KM, `Search within ${PROFESSIONAL_NEAR_RADIUS_MAX_KM}km`)
    .default(PROFESSIONAL_NEAR_RADIUS_KM),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(PROFESSIONAL_NEAR_LIMIT_MAX)
    .default(PROFESSIONAL_NEAR_LIMIT),
  available: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export type ProfessionalNearQuery = z.output<typeof professionalNearQuerySchema>;

/** Pre-parse: what the form holds, before trimming and normalising. */
export type ProfessionalApplyInput = z.input<typeof professionalApplySchema>;
/** Post-parse: what reaches the repository, licence and specialties normalised. */
export type ProfessionalApply = z.output<typeof professionalApplySchema>;
export type ProfessionalReject = z.output<typeof professionalRejectSchema>;
export type ProfessionalVerify = z.output<typeof professionalVerifySchema>;
/** Post-parse directory query: page and limit coerced from strings and defaulted. */
export type ProfessionalListQuery = z.output<typeof professionalListQuerySchema>;

/* -------------------------------------------------------------------------- *
 * Joining, stage one: the enquiry
 *
 * Nobody fills in the long form uninvited. A short public form asks who you are,
 * what licence you hold, where you practise and why you want in; a reviewer reads
 * that and either emails an application link or turns it down with a reason. The
 * two stages are separate shapes because they are answered by different people at
 * different times — and because stage one is reachable by anyone, so it has to be
 * cheap to refuse.
 * -------------------------------------------------------------------------- */

/**
 * Where an enquiry sits.
 *
 * 'invited' means a link went out and is still live; 'completed' means the
 * application behind that link was filed, which retires the link. 'declined' is a
 * reviewer's no, with the reason kept — a declined enquiry is not deleted, because
 * the same person may write in again and the previous answer is context.
 */
export const PROFESSIONAL_INQUIRY_STATUSES = [
  'pending',
  'invited',
  'declined',
  'completed',
] as const;
export type ProfessionalInquiryStatus = (typeof PROFESSIONAL_INQUIRY_STATUSES)[number];

/**
 * Why an emailed link will not open the application form.
 *
 * Four answers rather than one 404, because they need four different sentences on
 * the page: 'not-found' is a mistyped or invented link, 'withdrawn' is an enquiry
 * declined after the invitation went out, 'used' is a link whose application was
 * already filed, and 'expired' is one that simply sat too long. Only the last is
 * worth asking for a resend over, and the page can only say so if it knows which
 * happened. Shared because the server sends one of these as the refusal `reason`
 * and the client renders the matching copy.
 */
export const PROFESSIONAL_INVITE_REFUSALS = ['not-found', 'withdrawn', 'used', 'expired'] as const;
export type ProfessionalInviteRefusal = (typeof PROFESSIONAL_INVITE_REFUSALS)[number];

/**
 * The public first form.
 *
 * The name and email are the applicant's own claim at this point — nothing has
 * been checked, and the email is only the address an invitation would go to. The
 * licence number is normalised the same way the application normalises it, so a
 * reviewer can search the two stages with one spelling.
 */
export const professionalInquirySchema = z.object({
  name: professionalNameField,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  licenseNumber: professionalFields.licenseNumber,
  /** Where the applicant is now — the city they would be interviewed in. */
  currentLocation: z
    .string()
    .trim()
    .min(2, 'Where are you based?')
    .max(PROFESSIONAL_LOCATION_MAX, 'That is too long for one line'),
  /** Where they practise, when that is somewhere else. Often the same place. */
  clinicLocation: z
    .string()
    .trim()
    .max(PROFESSIONAL_LOCATION_MAX, 'That is too long for one line')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /**
   * "Why do you want to join our team?" — the whole basis for the invite decision,
   * which is why it has a floor. A reviewer cannot act on three words.
   */
  motivation: z
    .string()
    .trim()
    .min(
      PROFESSIONAL_MOTIVATION_MIN,
      `Tell us in at least ${PROFESSIONAL_MOTIVATION_MIN} characters`
    )
    .max(PROFESSIONAL_MOTIVATION_MAX, 'That is longer than we need at this stage'),
  phone: phoneField,
  yearsExperience: professionalFields.yearsExperience.optional(),
});

/**
 * A reviewer inviting an enquiry through to the application.
 *
 * The note is optional and goes into the email above the link, for the cases
 * where there is something to say ("bring your board certificate to the
 * interview"). An approval owes nobody an explanation, so a required box would
 * only ever collect the word "ok".
 */
export const professionalInviteSchema = z.object({ note: moderationNote });

/**
 * A reviewer turning an enquiry away.
 *
 * The reason is for the queue and the audit log, not for the applicant: it is
 * written to colleagues, and the email says only that the enquiry was not taken
 * further.
 */
export const professionalDeclineSchema = z.object({ reason: moderationReason });

/**
 * Booking the interview.
 *
 * A date rather than a free-text note, because the applicant's screen counts down
 * to it and an audit row months later has to say when the conversation was
 * supposed to happen. Refused in the past: a scheduled interview that has already
 * been and gone is a typo, not a booking.
 */
export const professionalInterviewSchema = z.object({
  interviewAt: z
    .string()
    .datetime({ message: 'Give the interview date and time' })
    .refine((value) => Date.parse(value) > Date.now(), {
      message: 'That interview time has already passed',
    }),
  note: moderationNote,
});

/** Pre-parse: what the enquiry form holds, before trimming and normalising. */
export type ProfessionalInquiryInput = z.input<typeof professionalInquirySchema>;
/** Post-parse: what reaches the repository, licence and email normalised. */
export type ProfessionalInquiry = z.output<typeof professionalInquirySchema>;
export type ProfessionalInvite = z.output<typeof professionalInviteSchema>;
export type ProfessionalDecline = z.output<typeof professionalDeclineSchema>;
export type ProfessionalInterview = z.output<typeof professionalInterviewSchema>;

/** One address on a filed application, as both halves describe it. */
export type ProfessionalAddressInput = z.input<typeof professionalApplySchema>['addresses'][number];
export type LiveLocationInput = z.input<typeof liveLocationSchema>;
export type CapturedPhotoInput = z.input<typeof capturedPhotoSchema>;

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

/**
 * The permanent one.
 *
 * Identical in shape to a takedown's and deliberately its own name: this is the
 * request that leaves nothing to restore, and a route mounting the wrong schema
 * should read as wrong rather than as a synonym.
 */
export const blogPurgeSchema = z.object({ reason: moderationReason });

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

/**
 * The enquiry queue, which is the screen a reviewer actually starts on: an
 * application only exists once somebody has been invited to file one.
 *
 * Defaults to 'pending' for the same reason the application queue does — that is
 * the only status anybody is waiting on. The search covers the name, the email and
 * the licence number, because at this stage those three are all a reviewer has.
 */
export const adminInquiryListQuerySchema = z.object({
  ...adminPageFields,
  status: z.enum(PROFESSIONAL_INQUIRY_STATUSES).default('pending'),
  q: z.string().trim().min(2, 'Search for at least 2 characters').max(120).optional(),
});

export type AdminInquiryListQuery = z.output<typeof adminInquiryListQuerySchema>;

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
  'inquiryStatus',
  'professionalStatus',
] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

/**
 * The three breakdowns counted from accounts, and so the only three a `role`
 * filter says anything about: there is no role on a post or an application.
 *
 * `satisfies` rather than a bare literal, so this cannot drift into naming a
 * dimension the list above does not have.
 */
export const USER_BREAKDOWN_DIMENSIONS = [
  'provider',
  'role',
  'userStatus',
] as const satisfies readonly BreakdownDimension[];
export type UserBreakdownDimension = (typeof USER_BREAKDOWN_DIMENSIONS)[number];

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

/**
 * One breakdown chart, optionally narrowed to a single role.
 *
 * The role is what lets the user-management tabs say "suspended users" instead
 * of "suspended accounts" — the unfiltered count is every account, which is a
 * different question and the wrong one to print beside a list of one role. Sent
 * with a dimension it cannot narrow it is refused rather than ignored: quietly
 * dropping a filter answers a question nobody asked.
 */
export const metricsBreakdownQuerySchema = z
  .object({
    dimension: z.enum(BREAKDOWN_DIMENSIONS),
    role: z.enum(USER_ROLES).optional(),
  })
  .refine(
    (query) =>
      !query.role || (USER_BREAKDOWN_DIMENSIONS as readonly string[]).includes(query.dimension),
    { path: ['role'], message: 'A role only narrows the account breakdowns' }
  );

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

/* -------------------------------------------------------------------------- *
 * Appointments
 *
 * A pet owner picks a vet, a kind of visit and a slot; the vet answers. Both
 * halves read every list below — the client draws the grid and the status chips
 * from them, the server validates against them, and the professional's console
 * filters on them. Two copies would be a status one side can store and the other
 * cannot label.
 * -------------------------------------------------------------------------- */

/** Onsite is a visit to the address on the listing; virtual is a call. */
export const APPOINTMENT_KINDS = ['onsite', 'virtual'] as const;
export type AppointmentKind = (typeof APPOINTMENT_KINDS)[number];

/**
 * Where a booking sits.
 *
 * 'requested' is the only status an owner can create: nobody takes a vet's time
 * without the vet agreeing to it. 'confirmed' is that yes, 'declined' is a no with
 * a reason, 'cancelled' is either side calling off something already agreed, and
 * 'completed' is a consultation that happened. Nothing deletes a booking — an
 * owner asking why they were turned down deserves an answer months later.
 */
export const APPOINTMENT_STATUSES = [
  'requested',
  'confirmed',
  'declined',
  'cancelled',
  'completed',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/**
 * The statuses that hold their slot against everybody else.
 *
 * 'completed' is among them because that time was in fact used, and a grid that
 * later offered it again would be lying about the past. 'declined' and 'cancelled'
 * are not, because the whole point of both is that the time is free again.
 */
export const APPOINTMENT_LIVE_STATUSES = ['requested', 'confirmed', 'completed'] as const;

/** A calendar day, as the grid asks for it and the URL carries it. */
const isoDayField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date');

/**
 * Asking for the grid. `to` defaults to `from`, so one day is the short form.
 *
 * Ordered here rather than in the handler: a range that ends before it starts is a
 * malformed request, and answering it with an empty grid would read as "that vet
 * works no days".
 */
export const appointmentSlotsQuerySchema = z
  .object({ from: isoDayField, to: isoDayField.optional() })
  .refine((query) => !query.to || query.to >= query.from, {
    path: ['to'],
    message: 'That range ends before it starts',
  });

/**
 * Requesting one appointment.
 *
 * `startsAt` is the exact instant the grid offered, and it is re-checked against
 * the vet's schedule on the way in — a client that invents a time is refused
 * rather than believed. The pet is described rather than chosen: there is no pet
 * registry to pick from yet, and a booking that cannot say which animal it is
 * about is no use to the vet reading it.
 */
export const appointmentRequestSchema = z.object({
  professionalId: objectIdSchema,
  kind: z.enum(APPOINTMENT_KINDS),
  startsAt: z.string().datetime({ message: 'Pick a time from the ones offered' }),
  petName: z.string().trim().min(1, 'Whose visit is this?').max(60, 'That name is too long'),
  petSpecies: z.string().trim().min(2, 'Dog, cat, something else?').max(40, 'That is too long'),
  reason: z
    .string()
    .trim()
    .min(
      APPOINTMENT_REASON_MIN,
      `Say what it is about in at least ${APPOINTMENT_REASON_MIN} characters`
    )
    .max(APPOINTMENT_REASON_MAX, 'That is longer than we need here'),
  phone: phoneField,
});

/**
 * The vet saying yes.
 *
 * A virtual booking owes a link, and the service refuses one without it. The rule
 * is not in this schema because the kind is on the stored booking rather than in
 * the body: asking the client which rule applies to it is asking the wrong side.
 */
export const appointmentConfirmSchema = z.object({
  meetingUrl: z
    .string()
    .trim()
    .url('That is not a link')
    .max(500, 'That link is too long')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

/** Turning one down, or calling one off. The reason is shown to the other side. */
export const appointmentRefuseSchema = z.object({ reason: moderationReason });

/** The owner's own bookings, or a professional's incoming ones. */
export const appointmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page starts at 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(APPOINTMENT_PAGE_SIZE_MAX, `Ask for at most ${APPOINTMENT_PAGE_SIZE_MAX} per page`)
    .default(APPOINTMENT_PAGE_SIZE),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
});

export type AppointmentSlotsQuery = z.output<typeof appointmentSlotsQuerySchema>;
export type AppointmentRequestInput = z.input<typeof appointmentRequestSchema>;
export type AppointmentRequest = z.output<typeof appointmentRequestSchema>;
export type AppointmentConfirm = z.output<typeof appointmentConfirmSchema>;
export type AppointmentRefuse = z.output<typeof appointmentRefuseSchema>;
export type AppointmentListQuery = z.output<typeof appointmentListQuerySchema>;
