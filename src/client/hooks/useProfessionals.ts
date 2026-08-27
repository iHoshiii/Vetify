import { useAuth } from '@/components/providers/AuthProvider';
import { ApiError } from '@/services/api';
import {
  applyThroughInvite,
  fetchCapture,
  getInvite,
  getOwnApplication,
  listProfessionals,
  sendProfessionalInquiry,
  updateOwnProfessionalProfile,
  type InviteSummary,
  type OwnProfessional,
  type ProfessionalListParams,
  type ProfessionalPage,
} from '@/services/professionals.service';
import type {
  ProfessionalApplyInput,
  ProfessionalInquiryInput,
  ProfessionalProfileUpdateInput,
} from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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
  invite: (token: string) => [...professionalKeys.all, 'invite', token] as const,
  capture: (id: string) => [...professionalKeys.all, 'capture', id] as const,
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
 * Writes one row of the settings tray.
 *
 * The response is the whole listing, so it is written straight into the cache
 * rather than refetched. The public directory is invalidated with it: rate,
 * availability and hours are all things it prints.
 */
export function useUpdateProfessionalProfile() {
  const queryClient = useQueryClient();

  return useMutation<OwnProfessional, Error, ProfessionalProfileUpdateInput>({
    mutationFn: updateOwnProfessionalProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(professionalKeys.mine(), updated);
      queryClient.invalidateQueries({ queryKey: professionalKeys.lists() });
    },
  });
}

/**
 * Sends the short public form.
 *
 * Nothing to cache: the answer is an acknowledgement, and what happens next
 * arrives by email rather than on screen.
 */
export function useSendInquiry() {
  return useMutation<{ received: true }, Error, ProfessionalInquiryInput>({
    mutationFn: sendProfessionalInquiry,
  });
}

/**
 * The invitation behind an emailed link.
 *
 * Never retried on a refusal, and the refusals are the point: a dead link is an
 * answer with four possible reasons, and the page renders the one it is given
 * rather than "something went wrong".
 */
export function useInvite(token: string | undefined) {
  return useQuery<InviteSummary>({
    queryKey: professionalKeys.invite(token ?? ''),
    queryFn: ({ signal }) => getInvite(token as string, signal),
    enabled: Boolean(token),
    // The link is fixed for its lifetime; nothing about it changes while the form
    // is being filled in.
    staleTime: Infinity,
    retry: retryUnlessMissing,
  });
}

/**
 * Files the application behind an invitation.
 *
 * The reply is the created application, so it is written straight into the cache
 * the dashboard reads — the status screen renders from it without a second round
 * trip. The invitation is dropped from the cache in the same breath, since it has
 * just been spent.
 */
export function useApplyThroughInvite(token: string) {
  const queryClient = useQueryClient();

  return useMutation<OwnProfessional, Error, ProfessionalApplyInput>({
    mutationFn: (application) => applyThroughInvite({ token, application }),
    onSuccess: (application) => {
      queryClient.setQueryData(professionalKeys.mine(), application);
      queryClient.removeQueries({ queryKey: professionalKeys.invite(token) });
    },
  });
}

/**
 * One photograph, as something an `<img>` can point at.
 *
 * The bytes come through the API layer because the route is behind the bearer
 * token, and the object URL is revoked when the picture leaves the screen —
 * otherwise every render of a queue page would leak a blob for the life of the
 * document.
 */
export function useCapture(id: string | undefined) {
  const query = useQuery<Blob>({
    queryKey: professionalKeys.capture(id ?? ''),
    queryFn: ({ signal }) => fetchCapture(id as string, signal),
    enabled: Boolean(id),
    staleTime: Infinity,
    retry: retryUnlessMissing,
  });

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(query.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);

  return { url, isPending: query.isPending, isError: query.isError };
}
