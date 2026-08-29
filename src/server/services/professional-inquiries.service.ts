import crypto from 'node:crypto';

import { PROFESSIONAL_INVITE_DAYS } from '@shared/limits';
import type { ProfessionalInviteRefusal } from '@shared/schemas';
import type { ObjectId } from 'mongodb';

import {
  findProfessionalInquiryById,
  findProfessionalInquiryByToken,
  hashToken,
  insertProfessionalInquiry,
  inviteRefusal,
  recordAudit,
  updateProfessionalInquiry,
  type ProfessionalInquiryAttrs,
  type ProfessionalInquiryDocument,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import { deliverMail, type MailDelivery } from './mail.service';
import { applyLink, declineEmail, inviteEmail } from './professional-mail';
import { screenInquiry, type InquiryRefusal } from './professional-screen';

/** How long an emailed link stays usable. */
export const INVITE_TTL_MS = PROFESSIONAL_INVITE_DAYS * 24 * 60 * 60 * 1000;

/**
 * A fresh link, of which only the hash is kept.
 *
 * 32 bytes from the CSPRNG, hex-encoded, hashed with the same helper the refresh
 * tokens use. The raw token exists in this function's return value and in the
 * applicant's inbox, and nowhere else: a database that leaks leaks no usable
 * links.
 */
function mintInvite(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  };
}

/** Nobody reviews their own paperwork, here as in the application queue. */
function refuseSelfReview(inquiry: ProfessionalInquiryDocument, reviewer: User): void {
  if (inquiry.email === reviewer.email.trim().toLowerCase()) {
    throw AppError.forbidden('You cannot review your own enquiry');
  }
}

export type SubmitInquiryResult = {
  inquiry: ProfessionalInquiryDocument;
  /**
   * The rule that turned it away on the spot, or null when it went to the queue for
   * a person to read. Null is the common answer: the screen is narrow on purpose.
   */
  refusal: InquiryRefusal | null;
  /** How the automatic decline reached them. Null when nothing was declined. */
  mail: MailDelivery | null;
};

/**
 * Takes one enquiry off the public form: stores it, screens it, and closes it again
 * if the screen refuses.
 *
 * A service rather than four calls in the route handler, for the reason
 * {@link declineInquiry} is one: an enquiry closed without its audit entry is what
 * the audit log exists to prevent, and a status moved without the email is somebody
 * left waiting on an answer that already exists.
 *
 * A refusal is recorded as a declined row rather than thrown back at the form, and
 * that is the part worth being deliberate about. Three things follow from it: an
 * admin can see what the screen has been doing and catch a bad rule; the applicant
 * gets the same email a decline by hand would send, rather than a validation
 * error naming the rule they tripped; and the route can answer the same
 * `{ received: true }` either way, so the screen never becomes an oracle telling a
 * spammer which field to change.
 *
 * Screened after the insert, not before it. That way the unique index gets first
 * say — somebody whose enquiry is still open is told so, rather than quietly
 * auto-declined — and the rules read the normalised licence the row actually holds.
 *
 * Duplicate-address errors from that index are left to propagate: the route turns
 * them into the 409 that says a first enquiry is still waiting.
 */
export async function submitInquiry(input: {
  attrs: ProfessionalInquiryAttrs;
  ip?: string | null;
}): Promise<SubmitInquiryResult> {
  const { attrs, ip = null } = input;

  const stored = await insertProfessionalInquiry(attrs);
  const refusal = screenInquiry(stored);

  if (!refusal) return { inquiry: stored, refusal: null, mail: null };

  const inquiry = await updateProfessionalInquiry(stored._id, {
    status: 'declined',
    // Freed at once, which is what makes an automatic refusal safe to get wrong:
    // whoever was refused can write in again immediately, and the email below is the
    // one that already tells them so.
    openEmail: null,
    declineReason: `Automatic: ${refusal.detail}`,
    // Left null on purpose. Every human decline stamps a reviewer, so the absence of
    // one is what tells the two apart on the queue and in the log — no second field
    // to keep in step, the same trick `openEmail` itself plays one line up.
    reviewedBy: null,
    reviewedAt: new Date(),
  });

  if (!inquiry) return { inquiry: stored, refusal, mail: null };

  // The generic decline, not the rule. The applicant is told the enquiry went no
  // further, exactly as a decline by hand tells them; which rule fired is a note
  // to colleagues and stays on the row.
  const mail = await deliverMail(declineEmail({ to: inquiry.email, name: inquiry.name }));

  await recordAudit({
    action: 'professional.inquiry.auto-declined',
    targetType: 'professional-inquiry',
    targetId: inquiry._id,
    // No actor, because nobody decided this. The field is nullable for exactly this
    // case, and its own note in the audit document says so.
    actor: null,
    actorEmail: null,
    reason: inquiry.declineReason,
    metadata: {
      email: inquiry.email,
      licenseNumber: inquiry.licenseNumber,
      // Which of the two rules fired, so a run of refusals can be traced to the rule
      // behind them rather than read one reason string at a time.
      rule: refusal.rule,
      delivered: mail.delivered,
    },
    ip,
  });

  return { inquiry, refusal, mail };
}

export type InviteInquiryInput = {
  id: string | ObjectId;
  /** The admin deciding. Their id and email go into the audit entry. */
  reviewer: User;
  note?: string | null;
  ip?: string | null;
};

export type InviteInquiryResult = MailDelivery & {
  inquiry: ProfessionalInquiryDocument;
  /**
   * The raw link, handed back the once. It is not stored and cannot be read
   * again — a reviewer whose email bounced gets it from this response or not at
   * all.
   */
  link: string;
};

/**
 * Invites an enquiry to fill in the real application: mints the link, records it
 * as a hash, emails it, and leaves an audit entry behind.
 *
 * Called again on the same enquiry, it issues a new link rather than a second row.
 * That is what a resend is — the old token stops working, which is the behaviour
 * you want when the reason for resending is that the first one went astray.
 *
 * Returns null for an enquiry that does not exist, so the caller answers 404
 * without having to tell a missing row from a failed write.
 */
export async function inviteInquiry(
  input: InviteInquiryInput
): Promise<InviteInquiryResult | null> {
  const { id, reviewer, note = null, ip = null } = input;

  const current = await findProfessionalInquiryById(id);
  if (!current) return null;

  refuseSelfReview(current, reviewer);

  if (current.status === 'completed') {
    throw AppError.conflict('That enquiry has already been turned into an application');
  }

  // A decline is final on purpose. The address is free again the moment it is
  // declined, so the way back is the applicant writing in — which leaves the
  // reviewer a fresh enquiry to read rather than a closed one reopened silently.
  if (current.status === 'declined') {
    throw AppError.conflict('That enquiry was declined; ask them to write in again');
  }

  const { token, tokenHash, expiresAt } = mintInvite();
  const now = new Date();

  const inquiry = await updateProfessionalInquiry(current._id, {
    status: 'invited',
    inviteTokenHash: tokenHash,
    inviteExpiresAt: expiresAt,
    inviteNote: note?.trim() || null,
    invitedAt: now,
    // Read-then-write, which at worst undercounts a resend when two admins click
    // at the same second. The count is for a reviewer's information; nothing is
    // decided on it.
    inviteCount: current.inviteCount + 1,
    reviewedBy: reviewer._id,
    reviewedAt: now,
  });

  if (!inquiry) return null;

  const delivery = await deliverMail(
    inviteEmail({
      to: inquiry.email,
      name: inquiry.name,
      token,
      expiresAt,
      note: inquiry.inviteNote,
    })
  );

  await recordAudit({
    action: 'professional.invited',
    targetType: 'professional-inquiry',
    targetId: inquiry._id,
    actor: reviewer._id,
    actorEmail: reviewer.email,
    reason: inquiry.inviteNote,
    metadata: {
      email: inquiry.email,
      licenseNumber: inquiry.licenseNumber,
      inviteCount: inquiry.inviteCount,
      expiresAt: expiresAt.toISOString(),
      delivered: delivery.delivered,
    },
    ip,
  });

  return { inquiry, link: applyLink(token), ...delivery };
}

export type DeclineInquiryInput = {
  id: string | ObjectId;
  reviewer: User;
  reason: string;
  ip?: string | null;
};

export type DeclineInquiryResult = MailDelivery & { inquiry: ProfessionalInquiryDocument };

/**
 * Closes an enquiry with a reason, frees the address, and tells the applicant.
 *
 * The reason is written for the audit log and for whoever reads the queue next; it
 * is deliberately not in the email. `openEmail` goes to null, which is what lets
 * the same person write in again later — the index only holds one *open* enquiry
 * per address.
 */
export async function declineInquiry(
  input: DeclineInquiryInput
): Promise<DeclineInquiryResult | null> {
  const { id, reviewer, reason, ip = null } = input;

  const current = await findProfessionalInquiryById(id);
  if (!current) return null;

  refuseSelfReview(current, reviewer);

  if (!reason.trim()) {
    throw AppError.badRequest('A reason is required to decline an enquiry');
  }

  if (current.status === 'completed') {
    throw AppError.conflict('That enquiry has already been turned into an application');
  }

  const now = new Date();

  const inquiry = await updateProfessionalInquiry(current._id, {
    status: 'declined',
    // Frees the address for a future enquiry. The row stays: a decline has to be
    // explainable months later, same as a rejected application.
    openEmail: null,
    declineReason: reason.trim(),
    reviewedBy: reviewer._id,
    reviewedAt: now,
  });

  if (!inquiry) return null;

  // The hash is left in place rather than nulled, so a forwarded link can be told
  // apart from a made-up one and answered with "this was withdrawn".
  const delivery = await deliverMail(declineEmail({ to: inquiry.email, name: inquiry.name }));

  await recordAudit({
    action: 'professional.inquiry.declined',
    targetType: 'professional-inquiry',
    targetId: inquiry._id,
    actor: reviewer._id,
    actorEmail: reviewer.email,
    reason: inquiry.declineReason,
    metadata: {
      email: inquiry.email,
      licenseNumber: inquiry.licenseNumber,
      wasInvited: current.status === 'invited',
      delivered: delivery.delivered,
    },
    ip,
  });

  return { inquiry, ...delivery };
}

export type InviteLookup =
  | { ok: true; inquiry: ProfessionalInquiryDocument }
  | { ok: false; reason: ProfessionalInviteRefusal };

/**
 * The enquiry behind a raw token, if the link still opens.
 *
 * Only ever the hash goes to the database, so a token in a log line or a referrer
 * header cannot be turned back into a lookup. The refusal comes back with a reason
 * attached rather than as a bare null: the form has four different things to say,
 * and only one of them ("it expired") is worth asking for a resend over.
 */
export async function readInvite(token: string): Promise<InviteLookup> {
  const inquiry = await findProfessionalInquiryByToken(hashToken(token));
  if (!inquiry) return { ok: false, reason: 'not-found' };

  const refusal = inviteRefusal(inquiry);
  return refusal ? { ok: false, reason: refusal } : { ok: true, inquiry };
}

/**
 * Spends the invitation on the application just filed through it.
 *
 * Retires the link (`completedAt`, plus a status the refusal check reads as
 * 'used'), frees the address, and ties the two stages together with the
 * application's id — the only place the enquiry and the application meet.
 *
 * The token hash is left on the row so a second click on a forwarded link can be
 * told apart from an invented one and answered accordingly.
 */
export async function completeInquiry(
  id: string | ObjectId,
  application: ObjectId
): Promise<ProfessionalInquiryDocument | null> {
  return await updateProfessionalInquiry(id, {
    status: 'completed',
    openEmail: null,
    completedAt: new Date(),
    application,
  });
}
