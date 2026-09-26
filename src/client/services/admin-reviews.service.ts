import type { ReviewReportDecision, ReviewReportStatus } from '@shared/schemas';

import type { AdminPage } from './admin.service';
import { apiFetch } from './api';

// One abuse report joined to the review it flags, as the moderation queue reads it. Names ride unmasked because admin is a trusted surface, unlike the public reviews endpoint.
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

export type AdminReviewReportListParams = {
  page?: number;
  limit?: number;
  status?: ReviewReportStatus;
};

// GET /api/v1/admin/reviews - one page of the report queue, pending first.
export function listAdminReviewReports(
  params: AdminReviewReportListParams = {},
  signal?: AbortSignal
): Promise<AdminPage<AdminReviewReport>> {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  const query = search.toString();
  return apiFetch(`/admin/reviews${query ? `?${query}` : ''}`, { signal });
}

// PATCH /api/v1/admin/reviews/:id - dismiss leaves the review standing, remove strips its stars and recomputes the average. Remove needs a reason.
export function decideReviewReport(
  input: { id: string } & ReviewReportDecision
): Promise<{ id: string; status: ReviewReportStatus }> {
  const { id, ...body } = input;
  return apiFetch(`/admin/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}
