import type { ProfessionalPhotoKind } from '@shared/limits';
import type {
  ProfessionalAddressKind,
  ProfessionalApplyInput,
  ProfessionalInquiryInput,
  ProfessionalInviteRefusal,
  ProfessionalStatus,
} from '@shared/schemas';

import { apiFetch, apiFetchBlob } from './api';

export type { ProfessionalStatus };

/** A directory entry: what a pet owner needs to choose a vet, and nothing more. */
export type PublicProfessional = {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  clinicName: string | null;
  clinicAddress: string;
  businessPhone: string | null;
  specialties: string[];
  bio: string;
  yearsExperience: number;
  verifiedAt: string | null;
};

/** One address as a response carries it, fix and all. */
export type ProfessionalAddressView = {
  kind: ProfessionalAddressKind;
  line1: string;
  city: string;
  province: string;
  postalCode: string | null;
  fix: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  } | null;
};

/** The ids of the three photographs, to be fetched one at a time. */
export type ProfessionalCaptureIds = Partial<Record<ProfessionalPhotoKind, string>>;

/**
 * The caller's own application: what they submitted, plus where it stands.
 *
 * There is no counterpart that writes any of it. The submission is frozen once it
 * is filed, which is why the dashboard renders it read-only and points at support
 * rather than offering a form.
 */
export type OwnProfessional = {
  id: string;
  userId: string;
  fullName: string;
  licenseNumber: string;
  licenseAuthority: string;
  credentialUrls: string[];
  specialties: string[];
  clinicName: string | null;
  clinicAddress: string;
  addresses: ProfessionalAddressView[];
  businessPhone: string | null;
  bio: string;
  yearsExperience: number;
  status: ProfessionalStatus;
  captures: ProfessionalCaptureIds;
  interviewAt: string | null;
  interviewNote: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * What the invitation behind an emailed link says.
 *
 * Thin on purpose: the token is the only credential involved, so this is readable
 * by whoever holds the link. The three identity fields are the ones the form shows
 * as locked.
 */
export type InviteSummary = {
  name: string;
  email: string;
  licenseNumber: string;
  currentLocation: string;
  clinicLocation: string | null;
  expiresAt: string;
};

export type { ProfessionalInviteRefusal };

export type ProfessionalPage = {
  items: PublicProfessional[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ProfessionalListParams = {
  page?: number;
  limit?: number;
  specialty?: string;
};

/** GET /api/v1/professionals — one page of the verified directory. */
export async function listProfessionals(
  params: ProfessionalListParams = {},
  signal?: AbortSignal
): Promise<ProfessionalPage> {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.specialty) search.set('specialty', params.specialty);

  const query = search.toString();
  return apiFetch<ProfessionalPage>(`/professionals${query ? `?${query}` : ''}`, { signal });
}

/**
 * GET /api/v1/professionals/me — the caller's application.
 *
 * 404s when they have not applied, which is an answer rather than a failure. The
 * hook turns it into `null` so a page does not have to read status codes.
 */
export async function getOwnApplication(signal?: AbortSignal): Promise<OwnProfessional> {
  return apiFetch<OwnProfessional>('/professionals/me', { signal });
}

/**
 * POST /api/v1/professionals/inquiries — stage one, the short form.
 *
 * Needs a session, and answers with nothing but an acknowledgement: what happens
 * next is an email, not a screen.
 */
export async function sendProfessionalInquiry(
  input: ProfessionalInquiryInput
): Promise<{ received: true }> {
  return apiFetch('/professionals/inquiries', { method: 'POST', body: input });
}

/**
 * GET /api/v1/professionals/invites/:token — what the emailed link opens.
 *
 * Readable without signing in, because the page has to be able to say "this link
 * is for maria@example.com, sign in as her" before it knows who is looking.
 */
export async function getInvite(token: string, signal?: AbortSignal): Promise<InviteSummary> {
  return apiFetch<InviteSummary>(`/professionals/invites/${encodeURIComponent(token)}`, { signal });
}

/** POST /api/v1/professionals/invites/:token/apply — stage two, through the link. */
export async function applyThroughInvite(input: {
  token: string;
  application: ProfessionalApplyInput;
}): Promise<OwnProfessional> {
  return apiFetch<OwnProfessional>(
    `/professionals/invites/${encodeURIComponent(input.token)}/apply`,
    { method: 'POST', body: input.application }
  );
}

/**
 * GET /api/v1/professionals/captures/:id — one photograph.
 *
 * Fetched rather than pointed at with an `<img src>`, because the route is behind
 * the bearer token and a plain image request would carry no Authorization header.
 * The caller turns the blob into an object URL and revokes it when the picture
 * leaves the screen.
 */
export async function fetchCapture(id: string, signal?: AbortSignal): Promise<Blob> {
  return await apiFetchBlob(`/professionals/captures/${encodeURIComponent(id)}`, { signal });
}
