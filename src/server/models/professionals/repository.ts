import { PROFESSIONAL_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection, type Filter, type Sort } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { escapeRegex } from '../text-search';
import { USERS_COLLECTION } from '../users/types';
import { PROFESSIONALS_COLLECTION } from './constants';
import {
  professionalAttrsSchema,
  type ProfessionalAttrs,
  type ProfessionalAttrsAddress,
} from './schema';
import type {
  ProfessionalAddress,
  ProfessionalDocument,
  ProfessionalStatus,
  ProfessionalWithAccount,
} from './types';

/** The review queue: applications in the order they arrived, newest first. */
const QUEUE_SORT: Sort = { createdAt: -1 };

const DUPLICATE_KEY = 11000;

export function professionalsCollection(): Collection<ProfessionalDocument> {
  return getDb().collection<ProfessionalDocument>(PROFESSIONALS_COLLECTION);
}

function duplicateKeyPattern(err: unknown): Record<string, unknown> | null {
  const detail = err as { code?: number; keyPattern?: Record<string, unknown> } | null;
  return detail?.code === DUPLICATE_KEY ? detail.keyPattern ?? {} : null;
}

/**
 * Which unique index an insert collided with. The route answers the two cases
 * differently - one is about the caller, the other about a licence somebody else
 * registered - and neither is a 500, so the distinction is drawn here rather
 * than by parsing driver errors inside a handler.
 */
export function isDuplicateApplication(err: unknown): boolean {
  return duplicateKeyPattern(err)?.user !== undefined;
}

export function isDuplicateLicense(err: unknown): boolean {
  return duplicateKeyPattern(err)?.licenseNumber !== undefined;
}

/**
 * The one address line the directory publishes.
 *
 * A clinic is published in full - it is a business address, already on a sign
 * outside. An applicant with only a home address is published as their city and
 * province, because "verified vet, works from home" should not mean "here is
 * their doorstep". Derived rather than typed for exactly that reason: if the
 * caller supplied this string, a house number could reach a public listing by
 * being sent in the wrong field.
 */
function publishableAddress(addresses: ProfessionalAddress[]): string {
  const clinic = addresses.find((address) => address.kind === 'clinic');
  if (clinic) return [clinic.line1, clinic.city, clinic.province].filter(Boolean).join(', ');

  const home = addresses.find((address) => address.kind === 'home');
  return home ? [home.city, home.province].filter(Boolean).join(', ') : '';
}

/** An address as the document holds it: dates parsed, absent fields explicit. */
function toStoredAddress(address: ProfessionalAttrsAddress): ProfessionalAddress {
  return {
    kind: address.kind,
    line1: address.line1,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode ?? null,
    fix: address.fix
      ? {
          latitude: address.fix.latitude,
          longitude: address.fix.longitude,
          accuracyMeters: address.fix.accuracyMeters,
          capturedAt: new Date(address.fix.capturedAt),
        }
      : null,
  };
}

/**
 * Files an application, letting the unique indexes decide the conflicts.
 *
 * Checking first and inserting second would still race two submits from the same
 * account, and the index is the only thing that cannot.
 *
 * The photographs are not written here. They go into their own collection, keyed
 * to the id this returns, which is why the row goes in first: a duplicate licence
 * is caught by this insert, and finding that out before megabytes of JPEG are
 * written is cheaper than the other order.
 */
export async function insertProfessional(attrs: ProfessionalAttrs): Promise<ProfessionalDocument> {
  const parsed = professionalAttrsSchema.parse(attrs);
  const now = new Date();
  const addresses = parsed.addresses.map(toStoredAddress);

  const doc: ProfessionalDocument = {
    _id: new ObjectId(),
    user: toObjectId(parsed.user),
    fullName: parsed.fullName,
    licenseNumber: parsed.licenseNumber,
    licenseAuthority: parsed.licenseAuthority,
    credentialUrls: parsed.credentialUrls ?? [],
    specialties: parsed.specialties ?? [],
    clinicName: parsed.clinicName ?? null,
    clinicAddress: publishableAddress(addresses),
    addresses,
    businessPhone: parsed.businessPhone ?? null,
    bio: parsed.bio,
    yearsExperience: parsed.yearsExperience,
    status: parsed.status,
    backgroundCheckConsentAt: parsed.backgroundCheckConsent ? now : null,
    interviewAt: null,
    interviewNote: null,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };

  await professionalsCollection().insertOne(doc);
  return doc;
}

export async function findProfessionalById(
  id: string | ObjectId
): Promise<ProfessionalDocument | null> {
  return await professionalsCollection().findOne({ _id: toObjectId(id) });
}

/** The applicant's own application, whatever state it is in. */
export async function findProfessionalByUser(
  user: string | ObjectId
): Promise<ProfessionalDocument | null> {
  return await professionalsCollection().findOne({ user: toObjectId(user) });
}

export type FindProfessionalsOptions = {
  /** Restricts the read to these statuses. Omitting it means every status. */
  statuses?: ProfessionalStatus[];
  /**
   * Matches a licence number, the name on the licence, or a clinic name.
   *
   * The name is the one the application carries rather than the account's: it was
   * checked against a register, and it is the one a reviewer has in front of them
   * on paper. Email is still not searchable from here - that lives on the user
   * document, and reaching it would mean joining before filtering.
   */
  q?: string;
  page?: number;
  limit?: number;
  sort?: Sort;
};

/**
 * One page of applications and the total behind it - the admin review queue.
 * Always paginated: an unbounded find on a collection that only grows is a slow
 * query waiting for the day it matters.
 */
export async function findProfessionals(
  options: FindProfessionalsOptions = {}
): Promise<{ items: ProfessionalDocument[]; total: number }> {
  const { statuses, q, page = 1, limit = PROFESSIONAL_PAGE_SIZE, sort = QUEUE_SORT } = options;

  const filter: Filter<ProfessionalDocument> = {};
  if (statuses?.length) filter.status = { $in: statuses };

  const term = q?.trim();
  if (term) {
    const escaped = escapeRegex(term);
    filter.$or = [
      { licenseNumber: { $regex: escaped, $options: 'i' } },
      { fullName: { $regex: escaped, $options: 'i' } },
      { clinicName: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    professionalsCollection()
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    professionalsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

export type FindVerifiedOptions = {
  specialty?: string;
  /** Name, clinic, or anywhere in either address. */
  q?: string;
  minExperience?: number;
  maxRate?: number;
  /** Only the vets currently taking work. */
  available?: boolean;
  page?: number;
  limit?: number;
};

/**
 * The public directory: verified vets, joined to the accounts behind them.
 *
 * An aggregation rather than two round trips, because the name and the picture
 * live on the user document and the listing is useless without them. Three
 * details are deliberate:
 *
 * - `$sort` runs before the join, so `{ status: 1, reviewedAt: -1 }` can serve
 *   it. The stages after it preserve order.
 * - `$unwind` without `preserveNullAndEmptyArrays` drops an application whose
 *   account is gone, and the `$match` after it drops one whose owner is
 *   suspended or banned. A vet who has lost their account should not still be
 *   listed as bookable.
 * - `$facet` counts the same filtered, joined pipeline the page came from.
 *   Counting the applications alone would promise pages of vets that the account
 *   filter then removes.
 */
export async function findVerifiedProfessionals(
  options: FindVerifiedOptions = {}
): Promise<{ items: ProfessionalWithAccount[]; total: number }> {
  const {
    specialty,
    q,
    minExperience,
    maxRate,
    available,
    page = 1,
    limit = PROFESSIONAL_PAGE_SIZE,
  } = options;

  const match: Filter<ProfessionalDocument> = { status: 'verified' };
  // Specialties are stored lowercase, so an equality match against an array
  // element is all this needs - no $elemMatch, no regex.
  if (specialty) match.specialties = specialty;

  /**
   * Everything that needs an `$or` of its own, collected rather than assigned — two
   * of them written straight onto `match.$or` would overwrite each other, and the one
   * that lost would be a filter the caller believes is applied.
   *
   * The `$exists: false` halves below are for rows written before the setting they
   * test existed. It says the field was never written rather than that it holds
   * nothing, which is both the truth and what the driver types allow.
   */
  const clauses: Filter<ProfessionalDocument>[] = [];

  if (available) {
    // Absent counts as available, which is what the view already defaults it to: a
    // listing verified before the setting existed is taking work until its owner says
    // otherwise.
    clauses.push({
      $or: [{ availabilityStatus: 'available' }, { availabilityStatus: { $exists: false } }],
    });
  }

  // Written by the schema on every row it has ever inserted, so a plain comparison
  // needs no allowance for an absent field.
  if (typeof minExperience === 'number') match.yearsExperience = { $gte: minExperience };

  if (typeof maxRate === 'number') {
    // A listing with no rate stored predates the setting, and a ceiling is not a
    // reason to hide somebody who never claimed to exceed it.
    clauses.push({ $or: [{ hourlyRate: { $lte: maxRate } }, { hourlyRate: { $exists: false } }] });
  }

  const term = q?.trim();
  if (term) {
    // Escaped the way the admin search escapes it, and for the same reason: a search
    // box is user input, and the query language it lands in is not one it may write.
    const like = { $regex: escapeRegex(term), $options: 'i' };
    clauses.push({
      $or: [
        // The licence name rather than the account name, because this has to match
        // before the join to accounts — and the two agree anyway, since approval
        // copies the licence name onto the account.
        { fullName: like },
        { clinicName: like },
        { clinicAddress: like },
        { specialties: like },
        { 'addresses.line1': like },
        { 'addresses.city': like },
        { 'addresses.province': like },
      ],
    });
  }

  if (clauses.length > 0) match.$and = clauses;

  const [result] = await professionalsCollection()
    .aggregate<{ items: ProfessionalWithAccount[]; total: Array<{ value: number }> }>([
      { $match: match },
      { $sort: { reviewedAt: -1, _id: -1 } },
      {
        $lookup: {
          from: USERS_COLLECTION,
          localField: 'user',
          foreignField: '_id',
          as: 'account',
          // Projected inside the join, so the password never leaves the database
          // - let alone reaches a transform that might forget to drop it.
          pipeline: [{ $project: { name: 1, avatarUrl: 1, status: 1 } }],
        },
      },
      { $unwind: '$account' },
      { $match: { 'account.status': 'active' } },
      {
        $facet: {
          items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          total: [{ $count: 'value' }],
        },
      },
    ])
    .toArray();

  return { items: result?.items ?? [], total: result?.total[0]?.value ?? 0 };
}

/**
 * The verdicts that actually decide something.
 *
 * 'interview' is not among them: booking a conversation is not a decision, and
 * stamping `reviewedAt` for it would put an application the directory sorts by
 * verification date in among the ones already verified.
 */
const DECIDED_STATUSES: ProfessionalStatus[] = ['verified', 'rejected', 'suspended'];

/**
 * The fields an application can be moved to after it exists.
 *
 * The licence pair is not among them, and neither is anything the applicant
 * photographed or typed. A different licence is a different claim to verify, so it
 * goes through a new application rather than an edit that leaves an existing
 * 'verified' stamp attached to a number nobody checked - and the same argument
 * covers the name and the addresses, which were checked against a register and a
 * device.
 */
export type ProfessionalPatch = Partial<
  Pick<
    ProfessionalDocument,
    'status' | 'interviewAt' | 'interviewNote' | 'reviewedBy' | 'reviewedAt' | 'rejectionReason'
  >
>;

/**
 * Applies a patch and returns the application as it now stands.
 *
 * A status that reaches a verdict without a review date gets one, because the
 * directory sorts on it: an entry with a null `reviewedAt` would sort as though it
 * had never been reviewed at all.
 */
export async function updateProfessional(
  id: string | ObjectId,
  patch: ProfessionalPatch
): Promise<ProfessionalDocument | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return await findProfessionalById(_id);

  const set: Partial<ProfessionalDocument> = { ...patch, updatedAt: new Date() };
  if (patch.status && DECIDED_STATUSES.includes(patch.status) && patch.reviewedAt === undefined) {
    set.reviewedAt = new Date();
  }

  return await professionalsCollection().findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: 'after' }
  );
}

/**
 * The subset of an application a verified professional may move themselves.
 *
 * `yearsExperience` is not in it, and neither is anything else off the submitted
 * form: those were checked against a licence register, so they change through a
 * reviewer. `flaggedForRateReview` is in it because the rate check derives it —
 * it is written beside the rate, never sent by the caller.
 */
export type ProfessionalProfilePatch = Partial<
  Pick<
    ProfessionalDocument,
    | 'availabilityStatus'
    | 'weeklySchedule'
    | 'hourlyRate'
    | 'avatarUrl'
    | 'workHistory'
    | 'bookingNotificationMinutes'
    | 'flaggedForRateReview'
  >
>;

/**
 * Writes the settings above onto a listing.
 *
 * An empty patch reads instead of writing: the routes send only the fields a
 * request actually carried, and a caller that sent nothing editable should get
 * the current listing back rather than a bumped `updatedAt`.
 */
export async function updateProfessionalProfile(
  id: string | ObjectId,
  patch: ProfessionalProfilePatch
): Promise<ProfessionalDocument | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return await findProfessionalById(_id);

  const set: Partial<ProfessionalDocument> = { ...patch, updatedAt: new Date() };

  return await professionalsCollection().findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: 'after' }
  );
}

/**
 * Removes an application.
 *
 * The compensating half of filing one. An application whose photographs failed to
 * write is not an application a reviewer can act on, and leaving it behind would
 * hold both of the applicant's unique slots — one application per account, one
 * licence per authority — against a write that never finished.
 */
export async function deleteProfessional(id: string | ObjectId): Promise<boolean> {
  const result = await professionalsCollection().deleteOne({ _id: toObjectId(id) });
  return result.deletedCount === 1;
}

/**
 * How many applications sit in each status. Feeds the admin breakdown chart and
 * the "N waiting" badge on the queue; the status index keeps it cheap enough to
 * run per request.
 */
export async function countProfessionalsByStatus(): Promise<Record<string, number>> {
  const rows = await professionalsCollection()
    .aggregate<{ _id: ProfessionalStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}
