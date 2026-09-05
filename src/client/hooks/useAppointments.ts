import { ApiError } from '@/services/api';
import {
  cancelAppointment,
  decideAppointment,
  getIncomingCounts,
  listIncomingAppointments,
  listMyAppointments,
  requestAppointment,
  type Appointment,
  type AppointmentDecision,
  type AppointmentListParams,
  type AppointmentPage,
  type AppointmentTally,
  type DecisionResult,
  type RequestResult,
} from '@/services/appointments.service';
import type { AppointmentRequestInput } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { professionalKeys } from './useProfessionals';

/**
 * Cache keys for everything booking-shaped, the same factory shape as the professional
 * keys so an invalidation can target one list or the whole family without a caller
 * hand-writing a matching array.
 */
export const appointmentKeys = {
  all: ['appointments'] as const,
  mine: (params: AppointmentListParams) => [...appointmentKeys.all, 'mine', params] as const,
  incoming: (params: AppointmentListParams) =>
    [...appointmentKeys.all, 'incoming', params] as const,
  counts: () => [...appointmentKeys.all, 'incoming', 'counts'] as const,
};

/**
 * A booking changes fast and matters when it does, so this is short.
 *
 * Thirty seconds rather than the directory's minute: a vet watching their console for
 * a request, and an owner watching for an answer, are both reading a page whose whole
 * point is what just happened.
 */
const STALE_TIME = 30_000;

/** A 4xx is an answer. Retrying one costs round trips and ends the same way. */
function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/** One page of what the caller has booked. */
export function useMyAppointments(params: AppointmentListParams = {}) {
  return useQuery<AppointmentPage>({
    queryKey: appointmentKeys.mine(params),
    queryFn: ({ signal }) => listMyAppointments(params, signal),
    staleTime: STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

/**
 * One page of what has been booked with the caller.
 *
 * Safe to call from any account: the server scopes it to the signed-in user, so an
 * owner who is not a vet gets an empty page rather than a refusal.
 */
export function useIncomingAppointments(params: AppointmentListParams = {}) {
  return useQuery<AppointmentPage>({
    queryKey: appointmentKeys.incoming(params),
    queryFn: ({ signal }) => listIncomingAppointments(params, signal),
    staleTime: STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

// Every figure the console's nav and tabs are labelled with, counted by the server rather than by the page of rows on screen
export function useIncomingAppointmentCounts() {
  return useQuery<AppointmentTally>({
    queryKey: appointmentKeys.counts(),
    queryFn: ({ signal }) => getIncomingCounts(signal),
    staleTime: STALE_TIME,
    retry: retryUnlessRefused,
  });
}

/**
 * Everything a booking touches, dropped from the cache in one place.
 *
 * Both lists, because a booking is on somebody's and somebody else's. And the slot
 * grids, because the whole point of a booking is that a slot is no longer free — a
 * page still showing it as open is the one thing this feature must not do.
 */
function invalidateBookings(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  void queryClient.invalidateQueries({ queryKey: professionalKeys.slots() });
}

/**
 * Asks for a slot.
 *
 * The 409 is not handled here. It carries `reason: 'slot-taken'`, and the page that
 * knows which grid it is showing is the one that should redraw it and say so.
 */
export function useRequestAppointment() {
  const queryClient = useQueryClient();

  return useMutation<RequestResult, Error, AppointmentRequestInput>({
    mutationFn: requestAppointment,
    onSuccess: () => invalidateBookings(queryClient),
  });
}

/** The vet's answer: confirm, decline, or mark one done. */
export function useDecideAppointment() {
  const queryClient = useQueryClient();

  return useMutation<
    DecisionResult,
    Error,
    { id: string; decision: AppointmentDecision; reason?: string; meetingUrl?: string }
  >({
    mutationFn: decideAppointment,
    onSuccess: () => invalidateBookings(queryClient),
  });
}

/** Either side calling one off. */
export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation<DecisionResult, Error, { id: string; reason: string }>({
    mutationFn: cancelAppointment,
    onSuccess: () => invalidateBookings(queryClient),
  });
}

export type { Appointment };
