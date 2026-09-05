import { APPOINTMENT_PAGE_SIZE } from '@shared/limits';
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
  return detail?.code === DUPLICATE_KEY && detail.keyPattern?.startsAt !== undefined;
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
    status: 'requested',
    // Set on the way in and nulled when the booking lets go. This is the field the
    // unique index actually watches.
    holdsSlot: true,
    petName: parsed.petName,
    petSpecies: parsed.petSpecies,
    reason: parsed.reason,
    phone: parsed.phone ?? null,
    meetingUrl: null,
    refusalReason: null,
    cancelledBy: null,
    decidedAt: null,
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
        startsAt: { $gte: input.from, $lt: input.to },
      },
      { projection: { startsAt: 1 } }
    )
    .toArray();

  return rows.map((row) => row.startsAt);
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
 * One page of somebody's bookings, soonest-first among the ones still ahead.
 *
 * Sorted descending on `startsAt`, which puts the next appointment at the top of a
 * console that is mostly read for "what is coming". A past booking is still in the
 * list, because "what happened last month" is the other reason to open it.
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

  const [items, total] = await Promise.all([
    appointmentsCollection()
      .find(filter)
      .sort({ startsAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
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
    'status' | 'holdsSlot' | 'meetingUrl' | 'refusalReason' | 'cancelledBy' | 'decidedAt'
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
/** How many bookings sit in each status, for whatever wants to count them. */
export async function countAppointmentsByStatus(): Promise<Record<string, number>> {
  const rows = await appointmentsCollection()
    .aggregate<{ _id: AppointmentStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}

/** Whether a status is one that keeps its slot. Read off the shared list. */
export function holdsSlotFor(status: AppointmentStatus): boolean {
  return (APPOINTMENT_LIVE_STATUSES as readonly string[]).includes(status);
}
