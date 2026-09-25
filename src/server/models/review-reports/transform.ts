import type { ReviewReportRow, AdminReviewReport, AdminReviewReportPage } from './types';

// Row to view. Ids stay alongside the names so a decision can be posted without a second read, and nothing is masked because admin is a trusted surface.
export function toAdminReviewReport(row: ReviewReportRow): AdminReviewReport {
  return {
    id: row._id.toHexString(),
    appointmentId: row.appointment.toHexString(),
    professionalId: row.professional.toHexString(),
    reporterId: row.reporter.toHexString(),
    reason: row.reason,
    status: row.status,
    stars: row.stars ?? null,
    comment: row.comment ?? null,
    reviewer: row.reviewerName ?? null,
    reporter: row.reporterName ?? null,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminReviewReportPage(
  result: { items: ReviewReportRow[]; total: number },
  page: number,
  limit: number
): AdminReviewReportPage {
  return {
    items: result.items.map(toAdminReviewReport),
    page,
    limit,
    total: result.total,
    pages: Math.max(1, Math.ceil(result.total / limit)),
  };
}
