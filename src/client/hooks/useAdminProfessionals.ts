import {
  getAdminProfessional,
  listAdminProfessionals,
  reviewProfessional,
  type AdminPage,
  type AdminProfessional,
  type AdminProfessionalListParams,
  type ProfessionalDecisionResult,
} from '@/services/admin.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { professionalKeys } from './useProfessionals';
import { ADMIN_STALE_TIME, adminKeys, invalidateAdmin, retryUnlessRefused } from './admin-keys';

/** One page of the queue. Pending by default, which is the reason to open it. */
export function useAdminProfessionals(params: AdminProfessionalListParams = {}) {
  return useQuery<AdminPage<AdminProfessional>>({
    queryKey: adminKeys.professionalList(params),
    queryFn: ({ signal }) => listAdminProfessionals(params, signal),
    staleTime: ADMIN_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

/** One application in full: the licence, the credentials, the applicant. */
export function useAdminProfessional(id: string | undefined) {
  return useQuery<AdminProfessional>({
    queryKey: adminKeys.professional(id ?? ''),
    queryFn: ({ signal }) => getAdminProfessional(id as string, signal),
    enabled: Boolean(id),
    staleTime: ADMIN_STALE_TIME,
    retry: retryUnlessRefused,
  });
}

/**
 * Approve, turn down, or pull a listing.
 *
 * Invalidates three families, all three of them things the verdict actually
 * changed: the queue, the account list — every verdict moves the applicant's role —
 * and the public directory, which is where a newly verified vet appears and a
 * suspended one has to disappear from.
 */
export function useReviewProfessional() {
  const queryClient = useQueryClient();

  return useMutation<
    ProfessionalDecisionResult,
    Error,
    { id: string; decision: 'verify' | 'reject' | 'suspend'; reason?: string }
  >({
    mutationFn: reviewProfessional,
    onSuccess: (result) => {
      queryClient.setQueryData(adminKeys.professional(result.application.id), result.application);
      invalidateAdmin(queryClient, adminKeys.professionals());
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      void queryClient.invalidateQueries({ queryKey: professionalKeys.all });
    },
  });
}
