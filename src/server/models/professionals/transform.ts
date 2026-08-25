import type {
  AdminApplicant,
  AdminProfessional,
  AdminProfessionalPage,
  OwnProfessional,
  ProfessionalDocument,
  ProfessionalPage,
  ProfessionalWithAccount,
  PublicProfessional,
} from './types';

/**
 * The application as its applicant sees it: everything they submitted, plus the
 * outcome and the reason for it. Not `reviewedBy` - which admin handled it is
 * internal, and naming them invites the argument to be taken up with a person
 * rather than with an appeal.
 */
export function toOwnProfessional(application: ProfessionalDocument): OwnProfessional {
  return {
    id: application._id.toString(),
    userId: application.user.toString(),
    licenseNumber: application.licenseNumber,
    licenseAuthority: application.licenseAuthority,
    credentialUrls: application.credentialUrls ?? [],
    specialties: application.specialties ?? [],
    clinicName: application.clinicName,
    clinicAddress: application.clinicAddress,
    bio: application.bio,
    yearsExperience: application.yearsExperience,
    status: application.status,
    rejectionReason: application.rejectionReason ?? null,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

/**
 * A directory entry.
 *
 * The licence number and the credential links are absent by construction rather
 * than by remembering to delete them: they are what a reviewer checks, not what a
 * pet owner browses. Returning the raw document is how that leaks, so no route
 * does.
 */
export function toPublicProfessional(application: ProfessionalWithAccount): PublicProfessional {
  return {
    id: application._id.toString(),
    userId: application.user.toString(),
    name: application.account?.name ?? null,
    avatarUrl: application.account?.avatarUrl ?? null,
    clinicName: application.clinicName,
    clinicAddress: application.clinicAddress,
    specialties: application.specialties ?? [],
    bio: application.bio,
    yearsExperience: application.yearsExperience,
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
  applicant: AdminApplicant | null
): AdminProfessional {
  return {
    ...toOwnProfessional(application),
    applicant,
    reviewedBy: application.reviewedBy?.toString() ?? null,
  };
}

/** A page of the review queue, paged like every other admin list. */
export function toAdminProfessionalPage(input: {
  items: ProfessionalDocument[];
  applicants: Map<string, AdminApplicant>;
  total: number;
  page: number;
  limit: number;
}): AdminProfessionalPage {
  return {
    items: input.items.map((application) =>
      toAdminProfessional(application, input.applicants.get(application.user.toString()) ?? null)
    ),
    page: input.page,
    limit: input.limit,
    total: input.total,
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
