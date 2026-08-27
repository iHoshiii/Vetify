import type { ProfessionalInviteRefusal } from '@shared/schemas';

import type { ProfessionalInquiryDocument } from './types';

/** The parts of an enquiry that decide whether its link still works. */
type InviteState = Pick<ProfessionalInquiryDocument, 'status' | 'inviteExpiresAt' | 'completedAt'>;

/**
 * Why the emailed link would be refused, or null when it would open.
 *
 * Three different things retire a link and they need three different sentences on
 * the page, so the answer is a reason rather than a boolean: a decline after the
 * fact pulls the link, filing the application spends it, and time runs out on it.
 * ('not-found' is the fourth reason and is not decidable from a row — it is what
 * the caller reports when no row matched the token at all.)
 */
export function inviteRefusal(inquiry: InviteState): ProfessionalInviteRefusal | null {
  if (inquiry.completedAt || inquiry.status === 'completed') return 'used';
  if (inquiry.status !== 'invited') return 'withdrawn';
  if (!inquiry.inviteExpiresAt || inquiry.inviteExpiresAt.getTime() <= Date.now()) {
    return 'expired';
  }

  return null;
}

/**
 * Whether the emailed link would still open the application form.
 *
 * The same question `inviteRefusal` answers, minus the reason — the admin queue
 * only needs to know whether to offer "resend" or "waiting on them". Defined in
 * terms of it so the screen and the route cannot come to different conclusions.
 *
 * Computed, never stored: a row can say 'invited' for a fortnight and stop being
 * actionable partway through, so a stored flag would be wrong from the moment it
 * was written.
 */
export function isInviteLive(inquiry: InviteState): boolean {
  return inviteRefusal(inquiry) === null;
}
