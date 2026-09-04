import { ADMIN_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection, type Filter, type Sort } from 'mongodb';

import { getDb } from '../../config/db';
import { dailyCountStages, type DailyCount } from '../daily-count';
import { toObjectId } from '../object-id';
import { escapeRegex } from '../text-search';
import { professionalInquiryAttrsSchema, type ProfessionalInquiryAttrs } from './schema';
import {
  PROFESSIONAL_INQUIRIES_COLLECTION,
  type ProfessionalInquiryDocument,
  type ProfessionalInquiryStatus,
} from './types';

/** The queue: enquiries in the order they arrived, newest first. */
const QUEUE_SORT: Sort = { createdAt: -1 };

const DUPLICATE_KEY = 11000;

export function professionalInquiriesCollection(): Collection<ProfessionalInquiryDocument> {
  return getDb().collection<ProfessionalInquiryDocument>(PROFESSIONAL_INQUIRIES_COLLECTION);
}

/**
 * Whether an insert lost the race for the one open enquiry an address may have.
 *
 * Left to the index rather than to a read-then-write in the route, which would
 * still let two submits from the same impatient person land at once and leave a
 * reviewer with the same enquiry twice.
 */
export function isDuplicateInquiry(err: unknown): boolean {
  const detail = err as { code?: number; keyPattern?: Record<string, unknown> } | null;
  return detail?.code === DUPLICATE_KEY && detail.keyPattern?.openEmail !== undefined;
}

/** Files an enquiry. Everything a reviewer decides on is null at this point. */
export async function insertProfessionalInquiry(
  attrs: ProfessionalInquiryAttrs
): Promise<ProfessionalInquiryDocument> {
  const parsed = professionalInquiryAttrsSchema.parse(attrs);
  const now = new Date();

  const doc: ProfessionalInquiryDocument = {
    _id: new ObjectId(),
    name: parsed.name,
    email: parsed.email,
    // Set on the way in and nulled when the enquiry closes. This is the field the
    // unique index actually watches.
    openEmail: parsed.email,
    licenseNumber: parsed.licenseNumber,
    licenseAuthority: parsed.licenseAuthority,
    currentLocation: parsed.currentLocation ?? null,
    currentPin: parsed.currentPin ?? null,
    clinicLocation: parsed.clinicLocation ?? null,
    clinicPin: parsed.clinicPin ?? null,
    clinicName: parsed.clinicName ?? null,
    motivation: parsed.motivation,
    phone: parsed.phone ?? null,
    yearsExperience: parsed.yearsExperience ?? null,
    status: 'pending',
    inviteTokenHash: null,
    inviteExpiresAt: null,
    inviteNote: null,
    invitedAt: null,
    inviteCount: 0,
    reviewedBy: null,
    reviewedAt: null,
    declineReason: null,
    completedAt: null,
    application: null,
    createdAt: now,
    updatedAt: now,
  };

  await professionalInquiriesCollection().insertOne(doc);
  return doc;
}

export async function findProfessionalInquiryById(
  id: string | ObjectId
): Promise<ProfessionalInquiryDocument | null> {
  return await professionalInquiriesCollection().findOne({ _id: toObjectId(id) });
}

/**
 * The enquiry behind an emailed link.
 *
 * Looked up by hash, so the token never has to be stored to be recognised. Says
 * nothing about whether the link is still live — `isInviteLive` answers that, and
 * the route wants the row either way in order to explain which of the three ways
 * it expired.
 */
export async function findProfessionalInquiryByToken(
  inviteTokenHash: string
): Promise<ProfessionalInquiryDocument | null> {
  return await professionalInquiriesCollection().findOne({ inviteTokenHash });
}

export type FindInquiriesOptions = {
  /** Restricts the read to these statuses. Omitting it means every status. */
  statuses?: ProfessionalInquiryStatus[];
  /**
   * Matches the name, the email or the licence number.
   *
   * Wider than the application queue's search, and deliberately: the enquiry is
   * not tied to the account that sent it, so at this stage these three strings are
   * everything a reviewer has to go on.
   */
  q?: string;
  page?: number;
  limit?: number;
  sort?: Sort;
};

/**
 * One page of enquiries and the total behind it. Always paginated, for the reason
 * every other list here is: an unbounded find on a collection that only grows is
 * a slow query waiting for the day it matters.
 */
export async function findProfessionalInquiries(
  options: FindInquiriesOptions = {}
): Promise<{ items: ProfessionalInquiryDocument[]; total: number }> {
  const { statuses, q, page = 1, limit = ADMIN_PAGE_SIZE, sort = QUEUE_SORT } = options;

  const filter: Filter<ProfessionalInquiryDocument> = {};
  if (statuses?.length) filter.status = { $in: statuses };

  const term = q?.trim();
  if (term) {
    const escaped = escapeRegex(term);
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { licenseNumber: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    professionalInquiriesCollection()
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    professionalInquiriesCollection().countDocuments(filter),
  ]);

  return { items, total };
}

/**
 * The fields an enquiry can be moved to once it exists.
 *
 * Nothing the applicant wrote is in here. An enquiry is a statement somebody made
 * on a public form, and a reviewer editing it before deciding on it would leave
 * the decision attached to words nobody typed. What a reviewer may change is the
 * verdict, the invitation and the trail behind both.
 */
export type ProfessionalInquiryPatch = Partial<
  Pick<
    ProfessionalInquiryDocument,
    | 'openEmail'
    | 'status'
    | 'inviteTokenHash'
    | 'inviteExpiresAt'
    | 'inviteNote'
    | 'invitedAt'
    | 'inviteCount'
    | 'reviewedBy'
    | 'reviewedAt'
    | 'declineReason'
    | 'completedAt'
    | 'application'
  >
>;

/** Applies a patch and returns the enquiry as it now stands. */
export async function updateProfessionalInquiry(
  id: string | ObjectId,
  patch: ProfessionalInquiryPatch
): Promise<ProfessionalInquiryDocument | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return await findProfessionalInquiryById(_id);

  return await professionalInquiriesCollection().findOneAndUpdate(
    { _id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}

/**
 * How many enquiries sit in each status. Feeds the "N waiting" badge above the
 * queue; the status index keeps it cheap enough to run per request.
 */
export async function countInquiriesByStatus(): Promise<Record<string, number>> {
  const rows = await professionalInquiriesCollection()
    .aggregate<{ _id: ProfessionalInquiryStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

/**
 * One row per day of enquiries filed, oldest first, since `from`.
 *
 * Counted from the enquiries themselves, not from activity events: nothing is
 * recorded when one arrives, and these rows outlive the 90-day event window anyway.
 */
export function countInquiriesPerDay(input: { from: Date }): Promise<DailyCount[]> {
  return professionalInquiriesCollection()
    .aggregate<DailyCount>([
      { $match: { createdAt: { $gte: input.from } } },
      ...dailyCountStages('createdAt'),
    ])
    .toArray();
}
