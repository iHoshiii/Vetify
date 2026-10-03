import type { ObjectId } from 'mongodb';
import {
  findProfessionalById,
  findUserById,
  recordAudit,
  updateProfessional,
  type ProfessionalDocument,
  type ProfessionalStatus,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import { deliverMail, type MailDelivery } from './mail.service';
import { interviewEmail } from './professional-mail';
export {
  reviewProfessional,
  type ProfessionalDecision,
  type ReviewProfessionalInput,
  type ReviewProfessionalResult,
} from './professional-review.service';

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
