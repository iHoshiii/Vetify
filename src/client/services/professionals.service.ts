import type { ProfessionalApplyInput } from '@shared/schemas';

import { apiFetch } from './api';

export type ProfessionalStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

/** A directory entry: what a pet owner needs to choose a vet, and nothing more. */
export type PublicProfessional = {
  id: string;
  userId: string;
  name: string | null;
  avatarUrl: string | null;
  clinicName: string;
  clinicAddress: string;
  specialties: string[];
  bio: string;
  yearsExperience: number;
  verifiedAt: string | null;
};

/** The caller's own application: what they submitted, plus where it stands. */
export type OwnProfessional = {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseAuthority: string;
  credentialUrls: string[];
  specialties: string[];
  clinicName: string;
  clinicAddress: string;
  bio: string;
  yearsExperience: number;
  status: ProfessionalStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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
 * hook turns it into `null` so a form does not have to read status codes.
 */
export async function getOwnApplication(signal?: AbortSignal): Promise<OwnProfessional> {
  return apiFetch<OwnProfessional>('/professionals/me', { signal });
}

/** POST /api/v1/professionals/apply — file one. */
export async function applyAsProfessional(input: ProfessionalApplyInput): Promise<OwnProfessional> {
  return apiFetch<OwnProfessional>('/professionals/apply', { method: 'POST', body: input });
}
