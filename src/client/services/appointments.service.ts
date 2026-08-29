import type { AppointmentKind, AppointmentStatus, AppointmentRequestInput } from '@shared/schemas';

import { apiFetch } from './api';

export type { AppointmentKind, AppointmentStatus };

/** Whether the message that went with a booking actually left. */
export type MailOutcome = { delivered: boolean; deliveryError: string | null };

/** The account on the other side of a booking. */
export type AppointmentParty = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

/**
 * A booking as either side reads it.
 *
 * One shape for both consoles, which is how the server sends it: the owner and the vet
 * want the same facts, and the only thing that differs is which party is "the other
 * one" — hence a single `with` rather than two fields, one of which is always yourself.
 */
export type Appointment = {
  id: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  minutes: number;
  petName: string;
  petSpecies: string;
  reason: string;
  phone: string | null;
  meetingUrl: string | null;
  refusalReason: string | null;
  /** True when the caller is the one who called it off. */
  cancelledByYou: boolean;
  with: AppointmentParty | null;
  /** The listing behind the vet, so a row can link to their profile. */
  professionalId: string;
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

/** Both emails a request sends, reported separately. */
export type RequestResult = {
  appointment: Appointment;
  mail: { client: MailOutcome; professional: MailOutcome };
};

/** One decision, and how the other side was told. Null when nothing was owed. */
export type DecisionResult = { appointment: Appointment; mail: MailOutcome | null };

export type AppointmentListParams = { page?: number; limit?: number; status?: AppointmentStatus };

function queryOf(params: AppointmentListParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);

  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * POST /api/v1/appointments — asks for a slot.
 *
 * A 409 with `reason: 'slot-taken'` means somebody else got there first. The caller
 * redraws the grid on that rather than showing a failure: it is a race the user can
 * understand and act on, not a bug.
 */
export async function requestAppointment(input: AppointmentRequestInput) {
  return await apiFetch<RequestResult>('/appointments', { method: 'POST', body: input });
}

/** GET /api/v1/appointments/mine — what the caller has booked. */
export async function listMyAppointments(params: AppointmentListParams = {}, signal?: AbortSignal) {
  return await apiFetch<AppointmentPage>(`/appointments/mine${queryOf(params)}`, { signal });
}

/** GET /api/v1/appointments/incoming — what has been booked with the caller. */
export async function listIncomingAppointments(
  params: AppointmentListParams = {},
  signal?: AbortSignal
) {
  return await apiFetch<AppointmentPage>(`/appointments/incoming${queryOf(params)}`, { signal });
}

/** What the vet can do to a booking. Cancelling is separate: either side may do that. */
export type AppointmentDecision = 'confirm' | 'decline' | 'complete';

/**
 * PATCH /api/v1/appointments/:id/{confirm,decline,complete} — the vet answering.
 *
 * One function for the three, because they differ only in the word and in what they
 * owe: a decline owes a reason, and confirming a virtual consultation owes a link the
 * server refuses to do without.
 */
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

/** PATCH /api/v1/appointments/:id/cancel — either side calling one off. */
export async function cancelAppointment(input: { id: string; reason: string }) {
  return await apiFetch<DecisionResult>(`/appointments/${encodeURIComponent(input.id)}/cancel`, {
    method: 'PATCH',
    body: { reason: input.reason },
  });
}
