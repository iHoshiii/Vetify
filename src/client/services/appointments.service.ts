import type { AppointmentKind, AppointmentStatus, AppointmentRequestInput } from '@shared/schemas';
import { APPOINTMENT_NO_SHOW_GRACE_MINUTES } from '@shared/limits';

import { apiFetch, ApiError } from './api';
import { appointmentRequestId, finishAppointmentRequest } from './appointment-request-id';

export type { AppointmentKind, AppointmentStatus };

export type MailOutcome = { delivered: boolean; deliveryError: string | null };

export type AppointmentParty = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type Appointment = {
  id: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  minutes: number;
  petName: string | null;
  petSpecies: string;
  petBreed: string | null;
  petAge: string | null;
  reason: string;
  phone: string | null;
  meetingUrl: string | null;
  refusalReason: string | null;
  cancelledByYou: boolean;
  with: AppointmentParty | null;
  professionalId: string;
  consultedAt: string | null;
  clientJoinedAt: string | null;
  rating: number | null;
  ratingComment: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type AppointmentPage = {
  items: Appointment[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};
export function canRateBooking(booking: Appointment, now: number): boolean {
  if (booking.kind === 'onsite') return booking.status === 'completed';
  if (booking.consultedAt !== null) return true;
  if (booking.clientJoinedAt === null) return false;
  return now - Date.parse(booking.startsAt) >= APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60_000;
}
export type RequestResult = {
  appointment: Appointment;
  mail: { professional: MailOutcome };
};

export type DecisionResult = { appointment: Appointment; mail: MailOutcome | null };

export type AppointmentListParams = {
  page?: number;
  limit?: number;
  status?: AppointmentStatus | readonly AppointmentStatus[];
  kind?: AppointmentKind;
};
export type AppointmentTally = Record<AppointmentKind, Record<AppointmentStatus, number>>;

function queryOf(params: AppointmentListParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.status) search.set('status', [params.status].flat().join(','));
  if (params.kind) search.set('kind', params.kind);

  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function requestAppointment(
  input: AppointmentRequestInput,
  suppliedRequestId?: string
) {
  const requestId = suppliedRequestId ?? (await appointmentRequestId(input));
  try {
    const result = await apiFetch<RequestResult>('/appointments', {
      method: 'POST',
      body: input,
      headers: { 'Idempotency-Key': requestId },
    });
    finishAppointmentRequest(input, requestId);
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500)
      finishAppointmentRequest(input, requestId);
    throw error;
  }
}

export async function listMyAppointments(params: AppointmentListParams = {}, signal?: AbortSignal) {
  return await apiFetch<AppointmentPage>(`/appointments/mine${queryOf(params)}`, { signal });
}

export async function listIncomingAppointments(
  params: AppointmentListParams = {},
  signal?: AbortSignal
) {
  return await apiFetch<AppointmentPage>(`/appointments/incoming${queryOf(params)}`, { signal });
}
export async function getIncomingCounts(signal?: AbortSignal) {
  const { counts } = await apiFetch<{ counts: AppointmentTally }>('/appointments/incoming/counts', {
    signal,
  });
  return counts;
}

export type AppointmentDecision = 'confirm' | 'decline' | 'complete';
export async function decideAppointment(input: {
  id: string;
  decision: AppointmentDecision;
  reason?: string;
  meetingUrl?: string;
}) {
  const { id, decision, ...body } = input;

  return await apiFetch<DecisionResult>(`/appointments/${encodeURIComponent(id)}/${decision}`, {
    method: 'PATCH',
    body,
  });
}

export async function cancelAppointment(input: { id: string; reason: string }) {
  return await apiFetch<DecisionResult>(`/appointments/${encodeURIComponent(input.id)}/cancel`, {
    method: 'PATCH',
    body: { reason: input.reason },
  });
}
export async function rateAppointment(input: {
  id: string;
  rating: number;
  comment?: string | null;
}) {
  const { appointment } = await apiFetch<{ appointment: Appointment }>(
    `/appointments/${encodeURIComponent(input.id)}/rate`,
    { method: 'PATCH', body: { rating: input.rating, comment: input.comment ?? null } }
  );
  return appointment;
}
export async function replyToReview(input: { id: string; reply: string }) {
  return await apiFetch<{ reply: string | null; repliedAt: string | null }>(
    `/appointments/${encodeURIComponent(input.id)}/reply`,
    { method: 'POST', body: { reply: input.reply } }
  );
}
