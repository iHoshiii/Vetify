import {
  declineInquiry,
  getAdminInquiry,
  inviteInquiry,
  listAdminInquiries,
  type AdminInquiry,
  type AdminInquiryListParams,
  type AdminPage,
  type MailOutcome,
} from '@/services/admin.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ADMIN_STALE_TIME, adminKeys, invalidateAdmin, retryUnlessRefused } from './admin-keys';

/**
 * One page of the enquiry queue.
 *
 * Pending by default, which is the reason to open the screen: an application does
 * not exist until somebody here has been invited to file one.
 */
export function useAdminInquiries(params: AdminInquiryListParams = {}) {
  return useQuery<AdminPage<AdminInquiry>>({
    queryKey: adminKeys.inquiryList(params),
    queryFn: ({ signal }) => listAdminInquiries(params, signal),
    staleTime: ADMIN_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

/** One enquiry in full, for the panel beside the queue. */
export function useAdminInquiry(id: string | undefined) {
  return useQuery<AdminInquiry>({
    queryKey: adminKeys.inquiry(id ?? ''),
    queryFn: ({ signal }) => getAdminInquiry(id as string, signal),
    enabled: Boolean(id),
    staleTime: ADMIN_STALE_TIME,
    retry: retryUnlessRefused,
  });
}

/**
 * Invites an enquiry through, or resends the link.
 *
 * The raw link is in the result and nowhere else, so it is left to the caller to
 * put on screen — writing it into the cache would keep a live credential in memory
 * for as long as the tab stayed open.
 */
export function useInviteInquiry() {
  const queryClient = useQueryClient();

  return useMutation<
    { inquiry: AdminInquiry; link: string } & MailOutcome,
    Error,
    { id: string; note?: string }
  >({
    mutationFn: inviteInquiry,
    onSuccess: (result) => {
      queryClient.setQueryData(adminKeys.inquiry(result.inquiry.id), result.inquiry);
      invalidateAdmin(queryClient, adminKeys.inquiries());
    },
  });
}

/** Turns an enquiry away, with a reason for the queue rather than for the sender. */
export function useDeclineInquiry() {
  const queryClient = useQueryClient();

  return useMutation<
    { inquiry: AdminInquiry } & MailOutcome,
    Error,
    { id: string; reason: string }
  >({
    mutationFn: declineInquiry,
    onSuccess: (result) => {
      queryClient.setQueryData(adminKeys.inquiry(result.inquiry.id), result.inquiry);
      invalidateAdmin(queryClient, adminKeys.inquiries());
    },
  });
}
