import {
  decideReviewReport,
  listAdminReviewReports,
  type AdminReviewReport,
  type AdminReviewReportListParams,
} from '@/services/admin-reviews.service';
import type { AdminPage } from '@/services/admin.service';
import type { ReviewReportStatus } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ADMIN_STALE_TIME, adminKeys, invalidateAdmin, retryUnlessRefused } from './admin-keys';

// One page of the report queue. Pending by default, which is the reason to open the screen.
export function useAdminReviewReports(params: AdminReviewReportListParams = {}) {
  return useQuery<AdminPage<AdminReviewReport>>({
    queryKey: adminKeys.reviewList(params),
    queryFn: ({ signal }) => listAdminReviewReports(params, signal),
    staleTime: ADMIN_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

// Closes a report. A removal recomputes the vet's average, so this invalidates the whole admin tree along with the queue.
export function useDecideReviewReport() {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string; status: ReviewReportStatus },
    Error,
    { id: string; action: 'dismiss' | 'remove'; reason?: string }
  >({
    mutationFn: decideReviewReport,
    onSuccess: () => {
      invalidateAdmin(queryClient, adminKeys.reviews());
    },
  });
}
