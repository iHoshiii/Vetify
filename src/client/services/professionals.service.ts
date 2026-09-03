import type {
  ProfessionalAvailabilityStatus,
  ProfessionalBookingNotificationTime,
  ProfessionalPhotoKind,
} from '@shared/limits';
import type {
  ProfessionalAddressKind,
  ProfessionalApplyInput,
  ProfessionalInquiryInput,
  ProfessionalInviteRefusal,
  ProfessionalMapUpdateInput,
  ProfessionalProfileUpdateInput,
  ProfessionalStatus,
  WeeklyScheduleItem,
  WorkHistoryItem,
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
  /**
   * Where they work, home addresses included, so a search can match a street that a
   * clinic name would miss. Without the device fix each one was verified with, which
   * is a reviewer's material rather than part of a profile.
   */
  addresses: PublicAddress[];
  businessPhone: string | null;
  specialties: string[];
  bio: string;
  yearsExperience: number;
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  weeklySchedule: WeeklyScheduleItem[];
  workHistory: WorkHistoryItem[];
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
  /**
   * Where the vet dropped the pin, kept whether or not it is published — which is
   * what lets the picker reopen on the marker they left rather than on a guess.
   */
  mapPin: { latitude: number; longitude: number; placedAt: string } | null;
  /** Whether that pin is on the public map. Decided per address, off until it is not. */
  showOnMap: boolean;
};

/**
 * The same address as the directory publishes it.
 *
 * Spelled out rather than `Omit<…, 'fix'>`. The omission read clearly while there was
 * one field to take away; with a verification fix and a published pin to tell apart,
 * naming what a stranger may read is the point — and it is the shape the server's own
 * transform is written field-by-field for the same reason.
 *
 * No `showOnMap` and no `placedAt`: a pin that is here is published, and when the vet
 * put it there is between them and their console.
 */
export type PublicAddress = {
  kind: ProfessionalAddressKind;
  line1: string;
  city: string;
  province: string;
  postalCode: string | null;
  mapPin: { latitude: number; longitude: number } | null;
};

/** The ids of the three photographs, to be fetched one at a time. */
export type ProfessionalCaptureIds = Partial<Record<ProfessionalPhotoKind, string>>;

/**
 * The caller's own application: what they submitted, where it stands, and the
 * settings they may set on top of it once it is verified.
 *
 * The submitted half is frozen when it is filed — the console renders it
 * read-only and points at support rather than offering a form. The settings half
 * (rate, availability, hours, portrait, practice history, reminder lead time) is
 * what `updateOwnProfessionalProfile` writes.
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
  hourlyRate: number;
  availabilityStatus: ProfessionalAvailabilityStatus;
  weeklySchedule: WeeklyScheduleItem[];
  avatarUrl: string | null;
  workHistory: WorkHistoryItem[];
  bookingNotificationMinutes: ProfessionalBookingNotificationTime;
  flaggedForRateReview: boolean;
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
  licenseAuthority?: string;
  currentLocation: string;
  // What the application's addresses are pinned at. Null on an enquiry filed before
  // the form started sending them.
  currentPin: { latitude: number; longitude: number } | null;
  clinicLocation: string | null;
  clinicPin: { latitude: number; longitude: number } | null;
  clinicName?: string | null;
  phone?: string | null;
  yearsExperience?: number;
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
  /** Name, clinic, or anywhere in either address. */
  q?: string;
  minExperience?: number;
  maxRate?: number;
  /** Only the vets currently taking work. */
  available?: boolean;
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
  if (params.q) search.set('q', params.q);
  // Sent as strings the schema coerces back. `available` is spelled out rather than
  // dropped when false, because 'false' is a real answer the server can read.
  if (params.minExperience) search.set('minExperience', String(params.minExperience));
  if (params.maxRate) search.set('maxRate', String(params.maxRate));
  if (params.available !== undefined) search.set('available', String(params.available));

  const query = search.toString();
  return apiFetch<ProfessionalPage>(`/professionals${query ? `?${query}` : ''}`, { signal });
}

/** A directory entry with how far away it is, as `GET /professionals/near` ranks them. */
export type NearbyProfessional = PublicProfessional & { distanceMeters: number };

/**
 * The nearest vets, and the radius they were looked for in.
 *
 * The radius comes back so an empty list can say what was searched rather than leaving
 * the panel to guess at the number it asked with.
 */
export type NearbyProfessionals = { items: NearbyProfessional[]; radiusKm: number };

export type NearbyParams = {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  available?: boolean;
};

/**
 * GET /api/v1/professionals/near — the verified vets nearest a point, nearest first.
 *
 * Public, like the directory it reorders. Only vets who placed a pin and switched it on
 * are in the answer; the rest have no coordinates to rank.
 */
export async function listProfessionalsNear(
  params: NearbyParams,
  signal?: AbortSignal
): Promise<NearbyProfessionals> {
  const search = new URLSearchParams({
    lat: String(params.latitude),
    lng: String(params.longitude),
  });
  if (params.radiusKm) search.set('radiusKm', String(params.radiusKm));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.available !== undefined) search.set('available', String(params.available));

  return apiFetch<NearbyProfessionals>(`/professionals/near?${search.toString()}`, { signal });
}

/** One bookable start, and whether somebody already holds it. */
export type Slot = { at: string; taken: boolean };

/** One Manila calendar day of the grid. An empty day is a day the vet does not work. */
export type DaySlots = { date: string; slots: Slot[] };

/**
 * The grid for a range of days.
 *
 * `minutes` comes back with it so a button is labelled from the number the grid was
 * actually cut with, rather than from a copy of the constant on this side.
 */
export type SlotGrid = { minutes: number; days: DaySlots[] };

/**
 * GET /api/v1/professionals/:id — one directory entry.
 *
 * Public, like the list it comes out of. A listing that is not verified, or whose
 * account has been suspended, answers 404 rather than 403.
 */
export async function getProfessional(id: string, signal?: AbortSignal) {
  return await apiFetch<PublicProfessional>(`/professionals/${encodeURIComponent(id)}`, {
    signal,
  });
}

/**
 * GET /api/v1/professionals/:id/slots — the bookable grid.
 *
 * Behind a sign-in, unlike the listing: when a vet is booked is a fact about their
 * week rather than part of their advertisement. `to` defaults to `from` server-side,
 * so asking for one day means sending one date.
 */
export async function getProfessionalSlots(
  input: { id: string; from: string; to?: string },
  signal?: AbortSignal
) {
  const search = new URLSearchParams({ from: input.from });
  if (input.to) search.set('to', input.to);

  return await apiFetch<SlotGrid>(
    `/professionals/${encodeURIComponent(input.id)}/slots?${search.toString()}`,
    { signal }
  );
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
 * PATCH /api/v1/professionals/me/profile — one row's worth of settings.
 *
 * Send only what changed; the endpoint merges. Returns the whole listing back so
 * the caller does not have to guess what the server made of it.
 */
export async function updateOwnProfessionalProfile(
  input: ProfessionalProfileUpdateInput
): Promise<OwnProfessional> {
  return apiFetch<OwnProfessional>('/professionals/me/profile', {
    method: 'PATCH',
    body: input,
  });
}

/**
 * PATCH /api/v1/professionals/me/map-location — one address's place on the map.
 *
 * One address per call, named by `kind`, so publishing the clinic and keeping the house
 * off it is two calls that cannot interfere. A partial merge like its neighbour: leave
 * `pin` out to move the switch alone, leave `showOnMap` out to save a dragged marker
 * without deciding to publish it.
 */
export async function updateOwnMapLocation(
  input: ProfessionalMapUpdateInput
): Promise<OwnProfessional> {
  return apiFetch<OwnProfessional>('/professionals/me/map-location', {
    method: 'PATCH',
    body: input,
  });
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
