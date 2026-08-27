import type {
  AdminInquiry,
  AdminInquiryPage,
  InviteSummary,
  ProfessionalInquiryDocument,
} from './types';
import { isInviteLive } from './utils';

/**
 * An enquiry as a reviewer sees it.
 *
 * `inviteLive` is computed rather than stored, because it is a question about now:
 * a row can say 'invited' for a fortnight and stop being actionable partway
 * through. The screen needs to offer "resend" rather than "waiting on them" once
 * that happens, and a stored flag would be wrong from the moment it was written.
 */
export function toAdminInquiry(inquiry: ProfessionalInquiryDocument): AdminInquiry {
  return {
    id: inquiry._id.toString(),
    name: inquiry.name,
    email: inquiry.email,
    licenseNumber: inquiry.licenseNumber,
    currentLocation: inquiry.currentLocation,
    clinicLocation: inquiry.clinicLocation,
    motivation: inquiry.motivation,
    phone: inquiry.phone,
    yearsExperience: inquiry.yearsExperience,
    status: inquiry.status,
    inviteNote: inquiry.inviteNote,
    invitedAt: inquiry.invitedAt?.toISOString() ?? null,
    inviteExpiresAt: inquiry.inviteExpiresAt?.toISOString() ?? null,
    inviteLive: isInviteLive(inquiry),
    inviteCount: inquiry.inviteCount,
    declineReason: inquiry.declineReason,
    reviewedBy: inquiry.reviewedBy?.toString() ?? null,
    reviewedAt: inquiry.reviewedAt?.toISOString() ?? null,
    completedAt: inquiry.completedAt?.toISOString() ?? null,
    applicationId: inquiry.application?.toString() ?? null,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}

/** A page of the enquiry queue, paged like every other admin list. */
export function toAdminInquiryPage(input: {
  items: ProfessionalInquiryDocument[];
  total: number;
  page: number;
  limit: number;
}): AdminInquiryPage {
  return {
    items: input.items.map(toAdminInquiry),
    page: input.page,
    limit: input.limit,
    total: input.total,
    // At least one page, so an empty queue reads as "page 1 of 1" rather than
    // "page 1 of 0".
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}

/**
 * What the application form behind the link is told.
 *
 * The three identity fields it renders as locked, plus the two locations for
 * context, plus when the link stops working so the page can say so. Everything
 * else on the enquiry — the motivation, the reviewer's note, the trail — is not
 * something a link holder needs, and the link is the only thing standing between
 * this and a stranger.
 */
export function toInviteSummary(inquiry: ProfessionalInquiryDocument): InviteSummary {
  return {
    name: inquiry.name,
    email: inquiry.email,
    licenseNumber: inquiry.licenseNumber,
    currentLocation: inquiry.currentLocation,
    clinicLocation: inquiry.clinicLocation,
    // Only ever called for a live invite, so the date is there. Falling back to
    // the epoch would be a lie; an empty string is at least obviously wrong.
    expiresAt: inquiry.inviteExpiresAt?.toISOString() ?? '',
  };
}
