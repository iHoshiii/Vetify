import type { ObjectId } from 'mongodb';

import {
  averageRatingForProfessional,
  clearAppointmentRating,
  findAppointmentById,
  findReviewReportById,
  insertReviewReport,
  recordAudit,
  setProfessionalRating,
  setReviewReportStatus,
  type AuditAction,
  type ReviewReportDocument,
  type ReviewReportStatus,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';

export type ReportReviewInput = {
  appointmentId: string | ObjectId;
  // The account filing the report. Any signed-in user may report a review.
  reporter: ObjectId;
  reason: string;
};

// Files a pending report against a rated visit. The professional is copied off the booking so a later removal can recompute that vet's average without re-reading it. Null when the review does not exist or was never rated, so the public route answers 404 rather than distinguishing the two.
export async function reportReview(input: ReportReviewInput): Promise<ReviewReportDocument | null> {
  const current = await findAppointmentById(input.appointmentId);
  if (!current || current.rating === null) return null;

  const text = input.reason.trim();
  if (!text) {
    throw AppError.badRequest('Tell us what is wrong with the review');
  }

  return await insertReviewReport({
    appointment: current._id,
    professional: current.professional,
    reporter: input.reporter,
    reason: text,
  });
}

export type ReviewReportAction = 'dismiss' | 'remove';

const AUDIT_ACTION: Record<ReviewReportAction, AuditAction> = {
  dismiss: 'review.dismissed',
  remove: 'review.removed',
};

const NEXT_STATUS: Record<ReviewReportAction, ReviewReportStatus> = {
  dismiss: 'dismissed',
  remove: 'reviewed',
};

export type DecideReviewReportInput = {
  id: string | ObjectId;
  // The admin acting. Their id and email are copied into the audit entry.
  reviewer: User;
  action: ReviewReportAction;
  reason?: string | null;
  ip?: string | null;
};

// Closes a report with a reversible decision and an audit entry. 'dismiss' keeps the review untouched, 'remove' strips its stars and recomputes the vet's average from what is left. Null for a report that does not exist, so the caller answers 404.
export async function decideReviewReport(
  input: DecideReviewReportInput
): Promise<ReviewReportDocument | null> {
  const { id, reviewer, action, reason = null, ip = null } = input;

  const current = await findReviewReportById(id);
  if (!current) return null;

  // The route's schema requires this too, repeated here because a removal with no stated reason is exactly what the audit trail exists to prevent.
  if (action === 'remove' && !reason?.trim()) {
    throw AppError.badRequest('A reason is required to remove a review');
  }

  if (current.status !== 'pending') {
    throw AppError.conflict('That report has already been decided');
  }

  // Claims the report atomically so two admins cannot both decide it; a loser here gets null and answers 404 on a report that is no longer pending.
  const decided = await setReviewReportStatus(id, {
    status: NEXT_STATUS[action],
    decidedBy: reviewer._id,
  });
  if (!decided) return null;

  if (action === 'remove') {
    await clearAppointmentRating(current.appointment);
    // Recomputed from every remaining rated booking rather than nudged, so pulling one review cannot leave the average adrift.
    const summary = await averageRatingForProfessional(current.professional);
    await setProfessionalRating(current.professional, summary);
  }

  await recordAudit({
    action: AUDIT_ACTION[action],
    targetType: 'review',
    targetId: current.appointment,
    actor: reviewer._id,
    actorEmail: reviewer.email,
    reason,
    // Enough that the row explains itself without joining to a booking that may since have changed.
    metadata: {
      reportId: current._id.toString(),
      professionalId: current.professional.toString(),
      reporterId: current.reporter.toString(),
      statusFrom: 'pending',
      statusTo: NEXT_STATUS[action],
    },
    ip,
  });

  return decided;
}
