import { PROFESSIONAL_PAGE_SIZE } from '@shared/limits';
import type { ProfessionalAddressKind } from '@shared/schemas';
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
  GeoPoint,
  ProfessionalAddress,
  ProfessionalDocument,
  ProfessionalStatus,
  ProfessionalWithAccount,
  ProfessionalWithDistance,
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

/**
 * The indexed, published half of a pin — or nothing at all, which is how an address
 * stays off the map.
 *
 * The only place `mapPoint` is computed, called by the insert and by
 * `updateAddressMap` and by nothing else. Two callers deriving it separately is one
 * caller away from a hidden address sitting in the geospatial index, and the index is
 * what `$geoNear` ranks on.
 *
 * `undefined` and not null, deliberately: see `mapPoint` on ProfessionalAddress — a
 * 2dsphere index skips a missing field and chokes on an explicit null beside a real
 * point in the same array.
 *
 * Note the order: GeoJSON is `[longitude, latitude]`, the reverse of how the pair is
 * read aloud and of how every other coordinate in this file is written.
 */
function toGeoPoint(
  pin: { latitude: number; longitude: number } | null,
  showOnMap: boolean
): GeoPoint | undefined {
  return pin && showOnMap
    ? { type: 'Point', coordinates: [pin.longitude, pin.latitude] }
    : undefined;
}

/** An address as the document holds it: dates parsed, absent fields explicit. */
function toStoredAddress(address: ProfessionalAttrsAddress): ProfessionalAddress {
  const mapPin = address.mapPin
    ? {
        latitude: address.mapPin.latitude,
        longitude: address.mapPin.longitude,
        placedAt: address.mapPin.placedAt ? new Date(address.mapPin.placedAt) : new Date(),
      }
    : null;
  const point = toGeoPoint(mapPin, address.showOnMap);

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
    mapPin,
    // Spread rather than assigned, so an unpublished address carries no key at all.
    ...(point ? { mapPoint: point } : {}),
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

export type FindNearOptions = {
  /** Where the person searching is. Answers the query and is not stored anywhere. */
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  /** Only the vets currently taking work. */
  available?: boolean;
};

/**
 * How many rows to ask the database for, per row we intend to return.
 *
 * The suspended-account filter cannot run before `$geoNear` — nothing can — so the
 * limit has to come after the join, and a vet who lost their account would otherwise
 * occupy one of the ten nearest slots and be dropped from the answer afterwards.
 */
const NEAR_OVERFETCH = 3;

/**
 * The verified vets nearest a point, nearest first.
 *
 * A sibling of `findVerifiedProfessionals` rather than an option on it, because
 * `$geoNear` has to be the first stage of the pipeline and that function starts with
 * `$match`. What the two share — the account join and the active-account filter — is
 * repeated here rather than extracted, since the surrounding pipelines have nothing
 * else in common.
 *
 * Three properties of `$geoNear` this leans on, each asserted in a test rather than
 * trusted from a comment:
 *
 * - a document with no indexed value is excluded outright, so an unpinned vet — and a
 *   vet who placed a pin and left the switch off — is simply not in the answer;
 * - on an array field the distance reported is to the nearest indexed element, so a
 *   vet publishing both addresses is ranked by whichever is closer;
 * - `query` filters whole documents, not array elements, which is exactly why the
 *   hidden half of a pin must be absent from the index rather than merely flagged.
 */
export async function findProfessionalsNear(
  options: FindNearOptions
): Promise<ProfessionalWithDistance[]> {
  const { latitude, longitude, radiusKm, limit, available } = options;

  return await professionalsCollection()
    .aggregate<ProfessionalWithDistance>([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          // Metres, because the index is 2dsphere and the near point is GeoJSON. No
          // `distanceMultiplier`: the client is what turns metres into "1.2 km away",
          // and a rounded kilometre stored here would be a rounded kilometre sorted on.
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          // Named explicitly. There is one 2dsphere index on this collection today and
          // that will not always be true, and `$geoNear` errors rather than guessing
          // between two.
          key: 'addresses.mapPoint',
          // Nothing may precede `$geoNear`, so its own filter is where the status
          // guard goes. Absent `availabilityStatus` counts as available, the way the
          // directory already treats it.
          query: {
            status: 'verified',
            ...(available
              ? {
                  $or: [
                    { availabilityStatus: 'available' },
                    { availabilityStatus: { $exists: false } },
                  ],
                }
              : {}),
          },
        },
      },
      // Bounded before the join rather than after it. `$geoNear` walks outwards through
      // the index until the radius runs out, so an unbounded one over a country's worth
      // of pins joins every vet it found to their account before anything is dropped.
      { $limit: limit * NEAR_OVERFETCH },
      {
        $lookup: {
          from: USERS_COLLECTION,
          localField: 'user',
          foreignField: '_id',
          as: 'account',
          pipeline: [{ $project: { name: 1, avatarUrl: 1, status: 1 } }],
        },
      },
      { $unwind: '$account' },
      { $match: { 'account.status': 'active' } },
      // After the join, which is the point of over-fetching above. No `$facet` and no
      // total: "the ten nearest" is a list, not a directory page.
      { $limit: limit },
    ])
    .toArray();
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
 * Where a vet's pin sits, and whether it is published.
 *
 * Its own writer rather than a field on `ProfessionalProfilePatch`, because this
 * updates one element of an array and that patch `$set`s top-level fields. The
 * separation is worth more than the symmetry: an address was checked against a
 * register and a device and is deliberately not editable, so the write that touches
 * one has to be narrow enough that it provably cannot reach a street line.
 *
 * `showOnMap` is a parameter and `mapPoint` is derived from it here, so there is no
 * way through this function to store a published point for an address the vet is
 * hiding — or a hidden one whose coordinates are still in the index. The same move
 * `moveTo` makes in the appointments service, where the slot hold is derived from the
 * status rather than passed alongside it.
 *
 * Clearing the pin (`pin: null`) clears the point with it. Turning the switch off
 * keeps the pin: a vet who publishes again next month should not have to drag it back
 * into place.
 */
export async function updateAddressMap(
  id: string | ObjectId,
  input: {
    kind: ProfessionalAddressKind;
    pin: { latitude: number; longitude: number } | null;
    showOnMap: boolean;
  }
): Promise<ProfessionalDocument | null> {
  const pin = input.pin ? { ...input.pin, placedAt: new Date() } : null;
  const point = toGeoPoint(pin, input.showOnMap);
  const field = `addresses.$[a].mapPoint`;

  // Hiding *unsets* the point rather than nulling it. A null here is not an empty
  // value to a 2dsphere index — it is a value it tries to read as a shape and cannot,
  // and once one address on the document is published every later write to the other
  // fails with it. Unsetting is also the truer statement: this address is not on the
  // map, rather than being on it at nowhere.
  return await professionalsCollection().findOneAndUpdate(
    { _id: toObjectId(id), 'addresses.kind': input.kind },
    {
      // A positional filter rather than a rewrite of `addresses`: the update names the
      // two pin fields of the one element whose kind matches, so no request through
      // this path can touch a line, a city, a postcode, or a verification fix.
      $set: {
        'addresses.$[a].mapPin': pin,
        ...(point ? { [field]: point } : {}),
        updatedAt: new Date(),
      },
      ...(point ? {} : { $unset: { [field]: '' } }),
    },
    { arrayFilters: [{ 'a.kind': input.kind }], returnDocument: 'after' }
  );
}

// Verification is what publishes a pin: each address filed with a marker gains the point derived from it. An address without one is left alone rather than nulled, which the 2dsphere index would refuse on the next write.
export async function publishPinnedAddresses(
  id: string | ObjectId
): Promise<ProfessionalDocument | null> {
  return await professionalsCollection().findOneAndUpdate(
    { _id: toObjectId(id) },
    [
      {
        // A pipeline rather than `arrayFilters`, so one write covers however many
        // addresses were filed without naming a kind it has to guess at.
        $set: {
          addresses: {
            $map: {
              input: '$addresses',
              as: 'address',
              in: {
                $cond: [
                  { $ifNull: ['$$address.mapPin', false] },
                  {
                    $mergeObjects: [
                      '$$address',
                      {
                        // GeoJSON order, the reverse of how the pair is stored above it.
                        mapPoint: {
                          type: 'Point',
                          coordinates: ['$$address.mapPin.longitude', '$$address.mapPin.latitude'],
                        },
                      },
                    ],
                  },
                  '$$address',
                ],
              },
            },
          },
          updatedAt: '$$NOW',
        },
      },
    ],
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
