import type { ProfessionalInquiryDocument } from './types';

/**
 * Whether the emailed link would still open the application form.
 *
 * Three conditions rather than one, because three different things retire a link
 * and they fail in different ways: the enquiry has to still be in 'invited' (a
 * decline after the fact pulls the link), the application must not already have
 * been filed through it (single use), and it must not have expired. Kept as a
 * predicate over the document so the route, the admin view and the tests all ask
 * the same question.
 */
export function isInviteLive(
  inquiry: Pick<ProfessionalInquiryDocument, 'status' | 'inviteExpiresAt' | 'completedAt'>
): boolean {
  if (inquiry.status !== 'invited') return false;
  if (inquiry.completedAt) return false;

  return Boolean(inquiry.inviteExpiresAt && inquiry.inviteExpiresAt.getTime() > Date.now());
}
