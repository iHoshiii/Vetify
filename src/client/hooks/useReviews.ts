import { replyToReview } from '@/services/appointments.service';
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
