import type { ProfessionalCaptureIds } from '../professional-captures';
import type {
  AdminApplicant,
  AdminProfessional,
  AdminProfessionalPage,
  OwnProfessional,
  ProfessionalAddress,
  ProfessionalAddressView,
  ProfessionalDocument,
  ProfessionalPage,
  ProfessionalWithAccount,
  PublicProfessional,
} from './types';

/**
 * An application with no photographs against it yet.
 *
 * Shared rather than a fresh object per call, and the reason it exists at all is
 * that the ids are read separately from the row: a caller that has not looked them
 * up gets "none found" instead of a missing field.
 */
const NO_CAPTURES: ProfessionalCaptureIds = {};

/**
 * One address, as a response carries it.
 *
 * The device reading keeps its accuracy on the way out. A coordinate on its own
 * invites being read as fact; "within 12 m, taken at this time" is a claim a
 * reviewer can weigh, which is the only reason it was collected.
 */
function toAddressView(address: ProfessionalAddress): ProfessionalAddressView {
  return {
    kind: address.kind,
    line1: address.line1,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode ?? null,
    fix: address.fix
      ? {
          latitude: address.fix.latitude,
          longitude: address.fix.longitude,
          accuracyMeters: address.fix.accuracyMeters,
          capturedAt: address.fix.capturedAt.toISOString(),
        }
      : null,
  };
}

/**
 * The application as its applicant sees it: everything they submitted, plus the
 * outcome and the reason for it. Not `reviewedBy` - which admin handled it is
 * internal, and naming them invites the argument to be taken up with a person
 * rather than with an appeal.
 *
 * The photographs come back as ids rather than bytes. Three JPEGs inline would put
 * a few megabytes into every dashboard read, and streaming them one at a time is
 * also what lets the capture route check the caller owns them before it answers.
 *
 * Nothing here has a counterpart that writes it. The submission is frozen once it
 * is filed - the name was matched to a register, the addresses to a device - so the
 * dashboard renders this read-only and points at support instead of a form.
 */
export function toOwnProfessional(
  application: ProfessionalDocument,
  captures: ProfessionalCaptureIds = NO_CAPTURES
): OwnProfessional {
  return {
    id: application._id.toString(),
    userId: application.user.toString(),
    fullName: application.fullName,
    licenseNumber: application.licenseNumber,
    licenseAuthority: application.licenseAuthority,
    credentialUrls: application.credentialUrls ?? [],
    specialties: application.specialties ?? [],
    clinicName: application.clinicName ?? null,
    clinicAddress: application.clinicAddress,
    addresses: (application.addresses ?? []).map(toAddressView),
    businessPhone: application.businessPhone ?? null,
    bio: application.bio,
    yearsExperience: application.yearsExperience,
    hourlyRate: application.hourlyRate ?? 50,
    availabilityStatus: application.availabilityStatus ?? 'available',
    weeklySchedule: application.weeklySchedule ?? [],
    avatarUrl: application.avatarUrl ?? null,
    workHistory: application.workHistory ?? [],
    bookingNotificationMinutes: application.bookingNotificationMinutes ?? 30,
    flaggedForRateReview: application.flaggedForRateReview ?? false,
    status: application.status,
    captures,
    interviewAt: application.interviewAt?.toISOString() ?? null,
    interviewNote: application.interviewNote ?? null,
    rejectionReason: application.rejectionReason ?? null,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

/**
 * A directory entry.
 *
 * The licence number, the photographs and the addresses in full are absent by
 * construction rather than by remembering to delete them: they are what a reviewer
 * checks, not what a pet owner browses. Returning the raw document is how that
 * leaks, so no route does.
 *
 * The name shown is the one on the licence, with the account's as a fallback. That
 * order matters: an account name is whatever its holder last typed into settings,
 * and printing it beside a verified badge would let a listing drift away from the
 * licence that earned the badge.
 *
 * `clinicAddress` is the one publishable line, and for a vet with no clinic it is a
 * city rather than a doorstep.
 */
export function toPublicProfessional(application: ProfessionalWithAccount): PublicProfessional {
  return {
    id: application._id.toString(),
    userId: application.user.toString(),
    name: application.fullName || application.account?.name || null,
    avatarUrl: application.avatarUrl || application.account?.avatarUrl || null,
    clinicName: application.clinicName ?? null,
    clinicAddress: application.clinicAddress,
    businessPhone: application.businessPhone ?? null,
    specialties: application.specialties ?? [],
    bio: application.bio,
    yearsExperience: application.yearsExperience,
    hourlyRate: application.hourlyRate ?? 50,
    availabilityStatus: application.availabilityStatus ?? 'available',
    weeklySchedule: application.weeklySchedule ?? [],
    workHistory: application.workHistory ?? [],
    verifiedAt: application.reviewedAt?.toISOString() ?? null,
  };
}

/**
 * Wraps a page of directory entries with the counts a pager needs, so the
 * arithmetic lives in one place instead of in every route that lists something.
 */
export function toProfessionalPage(input: {
  items: ProfessionalWithAccount[];
  total: number;
  page: number;
  limit: number;
}): ProfessionalPage {
  return {
    items: input.items.map(toPublicProfessional),
    page: input.page,
    limit: input.limit,
    total: input.total,
    // At least one page, so an empty directory reads as "page 1 of 1" rather
    // than "page 1 of 0".
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}

/**
 * The reviewer's view of an application.
 *
 * Built on the applicant's own view rather than beside it, so a field added to
 * the submission shows up on the screen that reviews it instead of being
 * forgotten in one of two near-identical mappings.
 */
export function toAdminProfessional(
  application: ProfessionalDocument,
  applicant: AdminApplicant | null,
  captures: ProfessionalCaptureIds = NO_CAPTURES
): AdminProfessional {
  return {
    ...toOwnProfessional(application, captures),
    applicant,
    reviewedBy: application.reviewedBy?.toString() ?? null,
  };
}

/** A page of the review queue, paged like every other admin list. */
export function toAdminProfessionalPage(input: {
  items: ProfessionalDocument[];
  applicants: Map<string, AdminApplicant>;
  /**
   * Capture ids for the whole page, keyed by application id, or nothing if the
   * caller did not read them. Passed in rather than read here for the same reason
   * the applicants are: a page is one lookup, not one per row.
   */
  captures?: Map<string, ProfessionalCaptureIds>;
  total: number;
  page: number;
  limit: number;
}): AdminProfessionalPage {
  return {
    items: input.items.map((application) =>
      toAdminProfessional(
        application,
        input.applicants.get(application.user.toString()) ?? null,
        input.captures?.get(application._id.toString())
      )
    ),
    page: input.page,
    limit: input.limit,
    total: input.total,
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
