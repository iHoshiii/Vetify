import { ApiError } from '@/services/api';
import {
  cancelAppointment,
  decideAppointment,
  getIncomingCounts,
  listIncomingAppointments,
  listMyAppointments,
  rateAppointment,
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

export const appointmentKeys = {
  all: ['appointments'] as const,
  mine: (params: AppointmentListParams) => [...appointmentKeys.all, 'mine', params] as const,
  incoming: (params: AppointmentListParams) =>
    [...appointmentKeys.all, 'incoming', params] as const,
  counts: () => [...appointmentKeys.all, 'incoming', 'counts'] as const,
};

const STALE_TIME = 30_000;

// The vet console polls so a request that lands while it is open surfaces on its own.
// Only while the tab is focused: a console in a background tab is nobody waiting on it.
const POLL_INTERVAL = 30_000;

function retryUnlessRefused(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function useMyAppointments(params: AppointmentListParams = {}) {
  return useQuery<AppointmentPage>({
    queryKey: appointmentKeys.mine(params),
    queryFn: ({ signal }) => listMyAppointments(params, signal),
    staleTime: STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

export function useIncomingAppointments(params: AppointmentListParams = {}) {
  return useQuery<AppointmentPage>({
    queryKey: appointmentKeys.incoming(params),
    queryFn: ({ signal }) => listIncomingAppointments(params, signal),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
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
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
    retry: retryUnlessRefused,
  });
}

function invalidateBookings(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  void queryClient.invalidateQueries({ queryKey: professionalKeys.slots() });
}

export function useRequestAppointment() {
  const queryClient = useQueryClient();

  return useMutation<RequestResult, Error, AppointmentRequestInput>({
    mutationFn: (input) => requestAppointment(input),
    onSuccess: () => invalidateBookings(queryClient),
  });
}

export function useDecideAppointment() {
  const queryClient = useQueryClient();

  return useMutation<
    DecisionResult,
    Error,
    { id: string; decision: AppointmentDecision; reason?: string; meetingUrl?: string }
  >({
    mutationFn: decideAppointment,
    onSettled: () => invalidateBookings(queryClient),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation<DecisionResult, Error, { id: string; reason: string }>({
    mutationFn: cancelAppointment,
    onSettled: () => invalidateBookings(queryClient),
  });
}

export function useRateAppointment() {
  const queryClient = useQueryClient();

  return useMutation<Appointment, Error, { id: string; rating: number; comment?: string | null }>({
    mutationFn: rateAppointment,
    onSuccess: () => invalidateBookings(queryClient),
  });
}

export type { Appointment };
