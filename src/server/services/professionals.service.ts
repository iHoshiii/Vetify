import type { ObjectId } from 'mongodb';

import {
  findProfessionalById,
  findUserById,
  recordAudit,
  updateProfessional,
  updateUser,
  type AuditAction,
  type ProfessionalDocument,
  type ProfessionalStatus,
  type User,
  type UserPatch,
  type UserRole,
} from '../models';
import { AppError } from '../utils/AppError';
import { deliverMail, type MailDelivery } from './mail.service';
import { interviewEmail, rejectedEmail, verifiedEmail } from './professional-mail';

/** The three verdicts a reviewer can reach. 'pending' is not one of them: an
 * application does not go back to being unread. */
export type ProfessionalDecision = 'verified' | 'rejected' | 'suspended';

const AUDIT_ACTION: Record<ProfessionalDecision, AuditAction> = {
  verified: 'professional.verified',
  rejected: 'professional.rejected',
  suspended: 'professional.suspended',
};

export type ReviewProfessionalInput = {
  id: string | ObjectId;
  decision: ProfessionalDecision;
  /** The admin deciding. Their id and email are copied into the audit entry. */
  reviewer: User;
  reason?: string | null;
  ip?: string | null;
};

export type ReviewProfessionalResult = {
  application: ProfessionalDocument;
  roleFrom: UserRole;
  roleTo: UserRole;
  /**
   * How the applicant was told, or null when nothing was owed them.
   *
   * Null and `{ delivered: false }` are different answers, and the screen says
   * different things about them: the first is a suspension, which sends no email
   * at all, and the second is an approval whose email did not go out.
   */
  mail: MailDelivery | null;
};

/**
 * Which role a verdict implies, given the role the applicant holds now.
 *
 * Both directions are guarded rather than assigned outright. Verifying an admin
 * must not demote them to 'professional', and rejecting an admin's application
 * must not strip their admin rights — a vet application is a claim about a
 * licence, not about who runs the dashboard. Anything other than the two
 * transitions below leaves the role exactly where it was.
 */
function roleAfter(decision: ProfessionalDecision, current: UserRole): UserRole {
  if (decision === 'verified') return current === 'user' ? 'professional' : current;
  return current === 'professional' ? 'user' : current;
}

/**
 * Tells the applicant what was decided, when the decision is one they are owed a
 * word about.
 *
 * Null for a suspension: that is an internal lever pulled on a listing rather than
 * a verdict on an application, and there is nothing in it the vet could act on.
 *
 * A missing account is reported rather than thrown, the way the interview booking
 * reports it — the verdict is real either way, and an application with no account
 * behind it is a data problem rather than a reason to refuse the reviewer.
 */
async function tellApplicant(
  decision: ProfessionalDecision,
  applicant: User | null,
  /**
   * The name on the licence, preferred over the account name for the greeting: it
   * is the one the reviewer has been reading, and the account name is editable
   * from settings. Neither being usable leaves the greeting to fall back to
   * "Hi there".
   */
  licenceName: string,
  reason: string | null
): Promise<MailDelivery | null> {
  if (decision === 'suspended') return null;

  if (!applicant) {
    return { delivered: false, deliveryError: 'The applicant no longer has an account' };
  }

  const to = applicant.email;
  const name = licenceName || applicant.name || '';

  // The reason is guaranteed for a rejection by the guard in `reviewProfessional`.
  // Narrowed on here rather than asserted, so this reads honestly on its own and a
  // rejection that somehow arrived without one sends nothing at all rather than an
  // email quoting a blank finding under a label that promises one.
  const message =
    decision === 'verified'
      ? verifiedEmail({ to, name })
      : reason
      ? rejectedEmail({ to, name, reason })
      : null;

  return message ? await deliverMail(message) : null;
}

/**
 * Records a verdict on one application: the status, the applicant's role, and the
 * audit entry, in that order.
 *
 * All three belong together, which is why this is a service rather than three
 * calls in a route handler. A verified application without the 'professional'
 * role is a vet who cannot post; a role change with no audit entry is the thing
 * the audit log exists to prevent. Phase 5's admin routes call this; the guards
 * here are the ones that must hold no matter which caller arrives.
 *
 * Returns null for an application that does not exist, so the caller can answer
 * 404 rather than distinguishing a missing row from a failed write.
 */
export async function reviewProfessional(
  input: ReviewProfessionalInput
): Promise<ReviewProfessionalResult | null> {
  const { id, decision, reviewer, reason = null, ip = null } = input;

  const current = await findProfessionalById(id);
  if (!current) return null;

  // A refusal is only fair if it says why, and a suspension has to stay
  // explainable months later. The route validates this too; it is repeated here
  // because the guard has to hold for every caller, not just the HTTP one.
  //
  // Trimmed once into a local rather than at each use: the same string is stored on
  // the application, copied into the audit entry and quoted back to the applicant,
  // and three separate trims are three chances for those three to disagree.
  const stated = reason?.trim() || null;
  if (decision !== 'verified' && !stated) {
    throw AppError.badRequest('A reason is required to reject or suspend an application');
  }

  // Nobody verifies their own licence. An admin who is also a vet applies like
  // everyone else and waits for a second pair of eyes - otherwise the audit
  // entry records the applicant approving the applicant.
  if (current.user.equals(reviewer._id)) {
    throw AppError.forbidden('You cannot review your own application');
  }

  const applicant = await findUserById(current.user);
  const roleFrom = applicant?.role ?? 'user';
  const roleTo = roleAfter(decision, roleFrom);

  const application = await updateProfessional(current._id, {
    status: decision,
    reviewedBy: reviewer._id,
    reviewedAt: new Date(),
    // A verification clears an earlier refusal: the reason no longer describes
    // where the application stands.
    rejectionReason: decision === 'verified' ? null : stated,
  });

  if (!application) return null;

  // The account carries the name on the licence from here on.
  //
  // A listing beside a verified badge has to be the person the register was
  // checked against, and the directory prints the account name as its fallback.
  // Copying it across on approval is what stops the two drifting apart, and it is
  // why the account name is fixed for a professional: changing it would rename a
  // verified vet.
  const accountPatch: UserPatch = {};
  if (roleTo !== roleFrom) accountPatch.role = roleTo;
  if (decision === 'verified' && applicant?.name !== application.fullName) {
    accountPatch.name = application.fullName;
  }

  if (applicant && Object.keys(accountPatch).length > 0) {
    await updateUser(applicant._id, accountPatch);
  }

  const mail = await tellApplicant(decision, applicant, application.fullName, stated);

  await recordAudit({
    action: AUDIT_ACTION[decision],
    targetType: 'professional',
    targetId: application._id,
    actor: reviewer._id,
    actorEmail: reviewer.email,
    reason: stated,
    // Enough for the audit screen to explain the row on its own, without a join
    // to an account that may since have been renamed or deleted.
    metadata: {
      applicantId: current.user.toString(),
      applicantEmail: applicant?.email ?? null,
      licenseNumber: current.licenseNumber,
      licenseAuthority: current.licenseAuthority,
      roleFrom,
      roleTo,
      // Null when nothing was owed — a suspension. Told apart in the log from an
      // approval whose email failed, which is the whole reason it is not a boolean.
      delivered: mail?.delivered ?? null,
    },
    ip,
  });

  return { application, roleFrom, roleTo, mail };
}

export type ScheduleInterviewInput = {
  id: string | ObjectId;
  reviewer: User;
  /** When the conversation happens. Must be ahead of now. */
  at: Date;
  note?: string | null;
  ip?: string | null;
};

export type ScheduleInterviewResult = MailDelivery & { application: ProfessionalDocument };

/** Statuses an interview can be booked from. */
const INTERVIEWABLE: ProfessionalStatus[] = ['pending', 'interview', 'rejected'];

/**
 * Books the conversation the applicant is waiting on, and tells them when.
 *
 * Not a verdict, and deliberately not recorded as one: `reviewedBy` and
 * `reviewedAt` are the trail behind a decision, and an application that is still
 * being talked about has not been decided. Who booked it is in the audit entry,
 * where it belongs.
 *
 * Bookable from 'rejected' as well as 'pending', because a rejected applicant may
 * appeal and an appeal that gets a hearing is exactly this. Re-opening one clears
 * the refusal reason — it no longer describes where the application stands. A
 * verified or suspended application is not interviewable: the first is finished and
 * the second is a separate lever.
 */
export async function scheduleInterview(
  input: ScheduleInterviewInput
): Promise<ScheduleInterviewResult | null> {
  const { id, reviewer, at, note = null, ip = null } = input;

  const current = await findProfessionalById(id);
  if (!current) return null;

  if (current.user.equals(reviewer._id)) {
    throw AppError.forbidden('You cannot review your own application');
  }

  if (!INTERVIEWABLE.includes(current.status)) {
    throw AppError.conflict(`An application that is ${current.status} cannot be interviewed`);
  }

  if (at.getTime() <= Date.now()) {
    throw AppError.badRequest('An interview has to be booked for a time in the future');
  }

  const application = await updateProfessional(current._id, {
    status: 'interview',
    interviewAt: at,
    interviewNote: note?.trim() || null,
    rejectionReason: null,
  });

  if (!application) return null;

  const applicant = await findUserById(current.user);

  // No account, no address to write to. Recorded rather than thrown: the booking
  // is real, and an orphaned application is a data problem, not a reason to refuse
  // the reviewer's action.
  const delivery = applicant
    ? await deliverMail(
        interviewEmail({
          to: applicant.email,
          // The name on the licence first: it is the one the reviewer has been
          // reading, and the account name is editable from settings. Neither being
          // usable leaves the greeting to fall back to "Hi there".
          name: application.fullName || applicant.name || '',
          at,
          note: application.interviewNote,
        })
      )
    : { delivered: false, deliveryError: 'The applicant no longer has an account' };

  await recordAudit({
    action: 'professional.interview',
    targetType: 'professional',
    targetId: application._id,
    actor: reviewer._id,
    actorEmail: reviewer.email,
    reason: application.interviewNote,
    metadata: {
      applicantId: current.user.toString(),
      applicantEmail: applicant?.email ?? null,
      licenseNumber: current.licenseNumber,
      statusFrom: current.status,
      interviewAt: at.toISOString(),
      delivered: delivery.delivered,
    },
    ip,
  });

  return { application, ...delivery };
}
