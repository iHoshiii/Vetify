import { replyToReview } from '@/services/appointments.service';
import { reportReview } from '@/services/professionals.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { professionalKeys } from './useProfessionals';

// Posts the vet's one public reply, then drops every cached page of that vet's reviews so the new response shows on the next read. professionalId scopes the invalidation to the one profile that changed.
export function useReplyToReview(professionalId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    { reply: string | null; repliedAt: string | null },
    Error,
    { id: string; reply: string }
  >({
    mutationFn: replyToReview,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...professionalKeys.detail(professionalId), 'reviews'],
      });
    },
  });
}

// Files an abuse report against one review. Nothing on the profile changes until an admin acts, so this touches no cache; the caller shows its own acknowledgement.
export function useReportReview() {
  return useMutation<
    { reported: true },
    Error,
    { professionalId: string; appointmentId: string; reason: string }
  >({
    mutationFn: reportReview,
  });
}
