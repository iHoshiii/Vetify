import { REVIEW_REPORT_STATUSES, type ReviewReportStatus } from '@shared/schemas';
import { ObjectId, type IndexDescription } from 'mongodb';

export const REVIEW_REPORTS_COLLECTION = 'reviewreports';

// Re-exported from the shared contract, as the inquiry statuses are: the queue renders these as filters and badges, so the list the server stores and the list the screen draws stay one list.
export { REVIEW_REPORT_STATUSES };
export type { ReviewReportStatus };

// One abuse report as the database holds it. A review is an appointment, so `appointment` is the review's id; `professional` is copied off it so a removal can recompute that vet's average without re-reading the booking.
export type ReviewReportDocument = {
  _id: ObjectId;
  appointment: ObjectId;
  professional: ObjectId;
  reporter: ObjectId;
  reason: string;
  status: ReviewReportStatus;
  // The admin's trail. Null while the report is still pending.
  decidedBy: ObjectId | null;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// A report joined to the review it flags, as the moderation queue reads it. Admin is a trusted surface, so the reviewer name and comment ride along unmasked, unlike the public reviews endpoint.
export type ReviewReportRow = ReviewReportDocument & {
  stars: number | null;
  comment: string | null;
  reviewerName: string | null;
  reporterName: string | null;
};

// The queue row the admin table renders. Ids kept alongside the names so a decision can be sent without a second read.
export type AdminReviewReport = {
  id: string;
  appointmentId: string;
  professionalId: string;
  reporterId: string;
  reason: string;
  status: ReviewReportStatus;
  stars: number | null;
  comment: string | null;
  reviewer: string | null;
  reporter: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type AdminReviewReportPage = {
  items: AdminReviewReport[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export const REVIEW_REPORT_INDEXES: IndexDescription[] = [
  // The queue: reports in a status, newest first.
  { key: { status: 1, createdAt: -1 } },
  // Every report ever filed against one review.
  { key: { appointment: 1, createdAt: -1 } },
];
