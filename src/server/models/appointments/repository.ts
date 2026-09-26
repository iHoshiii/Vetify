import { APPOINTMENT_NO_SHOW_GRACE_MINUTES, APPOINTMENT_PAGE_SIZE } from '@shared/limits';
import { APPOINTMENT_LIVE_STATUSES } from '@shared/schemas';
import { ObjectId, type Collection, type Filter } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { appointmentAttrsSchema, type AppointmentAttrs } from './schema';
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  APPOINTMENTS_COLLECTION,
  type AppointmentDocument,
  type AppointmentKind,
  type AppointmentStatus,
} from './types';

const DUPLICATE_KEY = 11000;

export function appointmentsCollection(): Collection<AppointmentDocument> {
  return getDb().collection<AppointmentDocument>(APPOINTMENTS_COLLECTION);
}

/**
 * Whether an insert lost the race for a slot.
 *
 * Left to the unique index rather than to a read-then-write in the service, which
 * two people clicking the same 2pm at the same moment would walk straight through —
 * and a double-booked vet is the one failure this whole feature exists to prevent.
 */
export function isDuplicateSlot(err: unknown): boolean {
  const detail = err as { code?: number; keyPattern?: Record<string, unknown> } | null;
  return detail?.code === DUPLICATE_KEY && detail.keyPattern?.heldSlots !== undefined;
}

/** Books a slot. Every booking starts as a request, holding the slot while it waits. */
export async function insertAppointment(attrs: AppointmentAttrs): Promise<AppointmentDocument> {
  const parsed = appointmentAttrsSchema.parse(attrs);
  const now = new Date();

  const doc: AppointmentDocument = {
    _id: new ObjectId(),
    professional: toObjectId(parsed.professional),
    professionalUser: toObjectId(parsed.professionalUser),
    client: toObjectId(parsed.client),
    kind: parsed.kind,
    startsAt: parsed.startsAt,
    minutes: parsed.minutes,
    heldSlots: parsed.heldSlots,
    status: 'requested',
    // Set on the way in and nulled when the booking lets go. This is the field the
    // unique index actually watches.
    holdsSlot: true,
    petName: parsed.petName ?? null,
    petSpecies: parsed.petSpecies,
    petBreed: parsed.petBreed ?? null,
    petAge: parsed.petAge ?? null,
    reason: parsed.reason,
    phone: parsed.phone ?? null,
    clientEmail: parsed.clientEmail ?? null,
    meetingUrl: null,
    refusalReason: null,
    cancelledBy: null,
    decidedAt: null,
    reminderSentAt: null,
    reviewPromptSentAt: null,
    joinedAt: null,
    consultedAt: null,
    clientJoinedAt: null,
    rating: null,
    ratingComment: null,
    ratedAt: null,
    reviewReply: null,
    reviewReplyAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await appointmentsCollection().insertOne(doc);
  return doc;
}

export async function findAppointmentById(
  id: string | ObjectId
): Promise<AppointmentDocument | null> {
  return await appointmentsCollection().findOne({ _id: toObjectId(id) });
}

/**
 * The slots already spoken for, between two instants.
 *
 * Reads only the held rows, which is exactly what the partial unique index
 * contains, so the grid is answered from the same index that enforces it — the
 * screen and the guard cannot disagree about which slots are gone.
 */
export async function findHeldSlots(input: {
  professional: string | ObjectId;
  from: Date;
  to: Date;
}): Promise<Date[]> {
  const rows = await appointmentsCollection()
    .find(
      {
        professional: toObjectId(input.professional),
        holdsSlot: { $type: 'bool' },
        // Any held hour in the window, not the start: a two-hour booking that began
        // the hour before the range still occupies a slot inside it.
        heldSlots: { $elemMatch: { $gte: input.from, $lt: input.to } },
      },
      { projection: { heldSlots: 1 } }
    )
    .toArray();

  // Flattened to the individual hours, so the grid marks the second hour of a
  // two-hour booking taken as surely as the first.
  return rows.flatMap((row) => row.heldSlots ?? []);
}

export type FindAppointmentsOptions = {
  /** Whose list this is. Exactly one of the two, which is what makes it a list. */
  client?: string | ObjectId;
  professionalUser?: string | ObjectId;
  // One status, or the several a single tab stands for
  status?: AppointmentStatus | readonly AppointmentStatus[];
  kind?: AppointmentKind;
  page?: number;
  limit?: number;
};

/**
 * One page of somebody's bookings: upcoming first, nearest to now at the very top.
 *
 * The console is mostly read for "what is coming", so the next appointment leads and
 * the rest of the upcoming ones follow soonest-first. Past bookings come after, most
 * recent first, because "what happened last month" is the other reason to open it.
 * `_past` splits the two groups and `_absDiff` orders each by proximity to now.
 */
export async function findAppointments(
  options: FindAppointmentsOptions
): Promise<{ items: AppointmentDocument[]; total: number }> {
  const {
    client,
    professionalUser,
    status,
    kind,
    page = 1,
    limit = APPOINTMENT_PAGE_SIZE,
  } = options;

  const filter: Filter<AppointmentDocument> = {};
  if (client) filter.client = toObjectId(client);
  if (professionalUser) filter.professionalUser = toObjectId(professionalUser);
  if (status) filter.status = Array.isArray(status) ? { $in: [...status] } : status;
  if (kind) filter.kind = kind;

  const now = new Date();

  const [items, total] = await Promise.all([
    appointmentsCollection()
      .aggregate<AppointmentDocument>([
        { $match: filter },
        {
          $addFields: {
            _past: { $cond: [{ $lt: ['$startsAt', now] }, 1, 0] },
            _absDiff: { $abs: { $subtract: ['$startsAt', now] } },
          },
        },
        { $sort: { _past: 1, _absDiff: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _past: 0, _absDiff: 0 } },
      ])
      .toArray(),
    appointmentsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

// Bookings counted by kind and then status, every cell present
export type AppointmentTally = Record<AppointmentKind, Record<AppointmentStatus, number>>;

// Zero-filled, so a console reading a cell gets a number rather than undefined
function emptyTally(): AppointmentTally {
  const statuses = () =>
    Object.fromEntries(APPOINTMENT_STATUSES.map((status) => [status, 0])) as Record<
      AppointmentStatus,
      number
    >;
  return Object.fromEntries(
    APPOINTMENT_KINDS.map((kind) => [kind, statuses()])
  ) as AppointmentTally;
}

/**
 * The fields a decision may move.
 *
 * `holdsSlot` is in the list because letting go of a slot is half of what declining
 * and cancelling mean; the other half is the status, and the service moves both
 * together or neither.
 */
export type AppointmentPatch = Partial<
  Pick<
    AppointmentDocument,
    | 'status'
    | 'holdsSlot'
    | 'meetingUrl'
    | 'refusalReason'
    | 'cancelledBy'
    | 'decidedAt'
    | 'joinedAt'
  >
>;

/** Applies a patch and returns the booking as it now stands. */
export async function updateAppointment(
  id: string | ObjectId,
  patch: AppointmentPatch
): Promise<AppointmentDocument | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return await findAppointmentById(_id);

  return await appointmentsCollection().findOneAndUpdate(
    { _id },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}

// The new span a reschedule writes: where it now starts, and the hours it now holds.
export type RescheduleFields = { startsAt: Date; heldSlots: Date[] };

// Moves a booking onto a new span and puts it back to a fresh request. Replacing heldSlots frees the old hours and claims the new ones in one write, so the unique index rejects a slot another live booking holds; the route turns that into the same 409 a first booking gets.
export async function moveAppointment(
  id: string | ObjectId,
  fields: RescheduleFields
): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    { _id: toObjectId(id) },
    {
      $set: {
        startsAt: fields.startsAt,
        heldSlots: fields.heldSlots,
        status: 'requested',
        holdsSlot: true,
        decidedAt: null,
        refusalReason: null,
        cancelledBy: null,
        reminderSentAt: null,
        reviewPromptSentAt: null,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );
}

// Confirmed bookings not yet reminded whose start falls within the widest lead window ahead.
export async function findRemindableAppointments(input: {
  from: Date;
  to: Date;
}): Promise<AppointmentDocument[]> {
  return await appointmentsCollection()
    .find({
      status: 'confirmed',
      // Missing on rows made before the field, which null also matches, so old bookings are covered.
      reminderSentAt: null,
      startsAt: { $gt: input.from, $lte: input.to },
    })
    .toArray();
}

// Claims a booking's reminder atomically, so two ticks or two instances cannot both send it.
export async function claimReminder(id: string | ObjectId): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    { _id: toObjectId(id), reminderSentAt: null },
    { $set: { reminderSentAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
}

// Confirmed bookings whose start is already past. The sweep re-checks each one's end (startsAt + minutes) in JS, since the end is not a stored field.
export async function findStartedConfirmed(before: Date): Promise<AppointmentDocument[]> {
  return await appointmentsCollection()
    .find({ status: 'confirmed', startsAt: { $lte: before } })
    .toArray();
}

// Flips one booking to completed, guarded on it still being confirmed so two ticks cannot both act. holdsSlot stays true because completed is a live status.
export async function completeConfirmed(
  id: string | ObjectId
): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    { _id: toObjectId(id), status: 'confirmed' },
    { $set: { status: 'completed', decidedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
}

// Stamps the first join on a call, once. The null-or-missing guard means later joins leave the original time alone.
export async function markCallJoined(id: string | ObjectId): Promise<void> {
  const now = new Date();
  await appointmentsCollection().updateOne(
    { _id: toObjectId(id), joinedAt: null },
    { $set: { joinedAt: now, updatedAt: now } }
  );
}

// Stamps the instant both accounts were in the call together, once. Only this marks a virtual booking rateable, so a no-show the scanner auto-completes never can be.
export async function markCallConnected(id: string | ObjectId): Promise<void> {
  const now = new Date();
  await appointmentsCollection().updateOne(
    { _id: toObjectId(id), consultedAt: null },
    { $set: { consultedAt: now, updatedAt: now } }
  );
}

// Stamps the instant the booker themselves joined, once. Lets a booker who showed up rate a vet who never connected, since joinedAt alone cannot say which party arrived.
export async function markClientJoined(id: string | ObjectId): Promise<void> {
  const now = new Date();
  await appointmentsCollection().updateOne(
    { _id: toObjectId(id), clientJoinedAt: null },
    { $set: { clientJoinedAt: now, updatedAt: now } }
  );
}

// The confirmed virtual booking the same two people hold starting exactly at a given instant, or null. Walks a back-to-back chain.
export async function findConfirmedCallStartingAt(input: {
  professional: ObjectId;
  client: ObjectId;
  startsAt: Date;
}): Promise<AppointmentDocument | null> {
  return await appointmentsCollection().findOne({
    professional: input.professional,
    client: input.client,
    kind: 'virtual',
    status: 'confirmed',
    startsAt: input.startsAt,
  });
}

// One aggregate for all ten figures the console draws, none of which may come from the page of rows on screen
export async function tallyAppointments(
  professionalUser: string | ObjectId
): Promise<AppointmentTally> {
  const rows = await appointmentsCollection()
    .aggregate<{ _id: { kind: AppointmentKind; status: AppointmentStatus }; count: number }>([
      { $match: { professionalUser: toObjectId(professionalUser) } },
      { $group: { _id: { kind: '$kind', status: '$status' }, count: { $sum: 1 } } },
    ])
    .toArray();

  const tally = emptyTally();
  for (const row of rows) {
    const kind = tally[row._id.kind];
    if (kind && row._id.status in kind) kind[row._id.status] = row.count;
  }

  return tally;
}

/** Whether a status is one that keeps its slot. Read off the shared list. */
export function holdsSlotFor(status: AppointmentStatus): boolean {
  return (APPOINTMENT_LIVE_STATUSES as readonly string[]).includes(status);
}

// Records the owner's stars and optional note on a consultation that has taken place. Rateable means an onsite booking that completed, a virtual one both parties actually connected on (consultedAt), or a virtual no-show the booker joined for once the grace past its start has passed. The rating:null guard makes the write idempotent, so a second submission cannot overwrite the first.
export async function rateAppointment(
  id: string | ObjectId,
  rating: number,
  comment: string | null
): Promise<AppointmentDocument | null> {
  const now = new Date();
  const noShowCutoff = new Date(now.getTime() - APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60_000);
  return await appointmentsCollection().findOneAndUpdate(
    {
      _id: toObjectId(id),
      rating: null,
      $or: [
        { status: 'completed', kind: 'onsite' },
        { kind: 'virtual', consultedAt: { $ne: null } },
        {
          kind: 'virtual',
          consultedAt: null,
          clientJoinedAt: { $ne: null },
          startsAt: { $lte: noShowCutoff },
        },
      ],
    },
    { $set: { rating, ratingComment: comment, ratedAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
}

// The mean and count of stars one vet has been given, over every rated booking. Recomputed from scratch on each new star so a changed rating cannot leave the figure drifting.
export async function averageRatingForProfessional(
  professional: string | ObjectId
): Promise<{ average: number; count: number }> {
  const [row] = await appointmentsCollection()
    .aggregate<{ average: number; count: number }>([
      { $match: { professional: toObjectId(professional), rating: { $type: 'number' } } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ])
    .toArray();

  return { average: row?.average ?? 0, count: row?.count ?? 0 };
}
