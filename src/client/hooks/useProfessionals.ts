import { useAuth } from '@/components/providers/AuthProvider';
import { ApiError } from '@/services/api';
import {
  applyAsProfessional,
  getOwnApplication,
  listProfessionals,
  type OwnProfessional,
  type ProfessionalListParams,
  type ProfessionalPage,
} from '@/services/professionals.service';
import type { ProfessionalApplyInput } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Cache keys for everything application-shaped, same factory shape as the blog
 * keys so an invalidation can target one query or the whole family without any
 * caller hand-writing a matching array.
 */
export const professionalKeys = {
  all: ['professionals'] as const,
  lists: () => [...professionalKeys.all, 'list'] as const,
  list: (params: ProfessionalListParams) => [...professionalKeys.lists(), params] as const,
  mine: () => [...professionalKeys.all, 'mine'] as const,
};

/** A directory changes only when an admin reviews something. */
const STALE_TIME = 60_000;

/** A 4xx is an answer. Retrying one costs round trips and ends the same way. */
function retryUnlessMissing(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/** One page of the verified directory. */
export function useProfessionals(params: ProfessionalListParams = {}) {
  return useQuery<ProfessionalPage>({
    queryKey: professionalKeys.list(params),
    queryFn: ({ signal }) => listProfessionals(params, signal),
    staleTime: STALE_TIME,
    // Keeps the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
    retry: retryUnlessMissing,
  });
}

/**
 * The caller's own application, or `null` when they have not filed one.
 *
 * "Never applied" arrives as a 404, which is a fact rather than a failure, so it
 * is folded into the data here. The form then branches on `data` alone and never
 * has to read a status code to decide whether to render itself.
 */
export function useOwnApplication() {
  const { isAuthenticated } = useAuth();

  return useQuery<OwnProfessional | null>({
    queryKey: professionalKeys.mine(),
    queryFn: async ({ signal }) => {
      try {
        return await getOwnApplication(signal);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: isAuthenticated,
    staleTime: STALE_TIME,
    retry: retryUnlessMissing,
  });
}

/**
 * Files an application.
 *
 * The reply is the created application, so it is written straight into the cache
 * the form reads — the status screen renders from it without a second round trip.
 */
export function useApplyAsProfessional() {
  const queryClient = useQueryClient();

  return useMutation<OwnProfessional, Error, ProfessionalApplyInput>({
    mutationFn: applyAsProfessional,
    onSuccess: (application) => {
      queryClient.setQueryData(professionalKeys.mine(), application);
      // A new application is pending, so no directory page changes yet — but the
      // list is invalidated anyway for the day this becomes an admin-side create.
      void queryClient.invalidateQueries({ queryKey: professionalKeys.lists() });
    },
  });
}
