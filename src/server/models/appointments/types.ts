import {
  APPOINTMENT_KINDS,
  APPOINTMENT_LIVE_STATUSES,
  APPOINTMENT_STATUSES,
  type AppointmentKind,
  type AppointmentStatus,
} from '@shared/schemas';
import { ObjectId, type IndexDescription } from 'mongodb';

export const APPOINTMENTS_COLLECTION = 'appointments';

/**
 * Re-exported from the shared contract for the reason the professional statuses
 * are: both consoles render these as chips and filters, so a second copy here
 * would let the server store a status neither screen can draw.
 */
export { APPOINTMENT_KINDS, APPOINTMENT_LIVE_STATUSES, APPOINTMENT_STATUSES };
export type { AppointmentKind, AppointmentStatus };

/** A booking as the database holds it. */
export type AppointmentDocument = {
  _id: ObjectId;
  /**
   * The application row, which is what a slot belongs to: the schedule, the rate
   * and the addresses all hang off it, and it survives the account being renamed.
   */
  professional: ObjectId;
  /**
   * The same vet's account.
   *
   * Denormalised so the console can read "everything booked with me" from the
   * signed-in user without first looking up which application is theirs. One
   * application per account is an index away, so the pair cannot come apart.
   */
  professionalUser: ObjectId;
  /** The pet owner who asked. */
  client: ObjectId;
  kind: AppointmentKind;
  /** The exact instant the slot starts. Generated from the vet's weekly schedule. */
  startsAt: Date;
  /**
   * How long the slot was when it was booked, copied rather than read back from
   * the constant. A booking is a promise about a span of time, and shortening the
   * slot length next year must not silently rewrite what was agreed.
   */
  minutes: number;
  /**
   * Every hour-start this booking occupies, the first equal to `startsAt`. A single
   * slot is one entry; a two-hour session is two.
   *
   * Stored rather than derived because it is what the unique index watches: one live
   * booking per vet per slot means the index has to see each held hour separately, and
   * a multikey index over this array collides the moment two bookings share any one of
   * them. `startsAt` alone could only ever guard the first.
   */
  heldSlots: Date[];
  status: AppointmentStatus;
  /**
   * Set while this booking holds its slot, and nulled the moment it lets go —
   * declined, or cancelled.
   *
   * The field is the filter. The rule is "one live booking per vet per slot", and
   * Mongo cannot express "the status is one of these three" as an index filter, so
   * the presence of this flag stands in for it. Exactly the trick `openEmail`
   * plays on an enquiry, for exactly the same reason — see the index below.
   */
  holdsSlot: boolean | null;
  // What the owner wrote. There is no pet registry to point at yet, so the animal
  // is described here rather than referenced.
  petName: string | null;
  petSpecies: string;
  petBreed: string | null;
  petAge: string | null;
  reason: string;
  /** A number for the vet to ring, when the owner gave one. */
  phone: string | null;
  // The address the owner gave at booking, if any, where their confirm/decline email goes.
  clientEmail: string | null;
  /** Unused since the call moved in-app. Kept nullable so old rows need no migration. */
  meetingUrl: string | null;
  /** Why it was declined or called off, and by whom. Shown to the other side. */
  refusalReason: string | null;
  /** Which of the two ended it, so neither is told they cancelled their own booking. */
  cancelledBy: ObjectId | null;
  decidedAt: Date | null;
  // When the pre-appointment reminder was pushed, so the scanner fires it once and never re-sends after a restart.
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** The other party on a booking, as the screen that lists it needs them. */
export type AppointmentParty = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

/**
 * A booking as either side reads it.
 *
 * One shape for both consoles rather than two. The owner and the vet want the same
 * facts about the same booking — when, what kind, what it is about, where it
 * stands — and the only thing that differs is which party is "the other one", which
 * is why that is a single field rather than two.
 */
export type AppointmentView = {
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
  /** True when the caller is the one who called it off. */
  cancelledByYou: boolean;
  /** The vet, on an owner's list; the owner, on a vet's. Null if that account is gone. */
  with: AppointmentParty | null;
  /** The listing behind the vet, so an owner's row can link to their profile. */
  professionalId: string;
  decidedAt: string | null;
  createdAt: string;
};

export type AppointmentPage = {
  items: AppointmentView[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export const APPOINTMENT_INDEXES: IndexDescription[] = [
  // Two people cannot hold the same slot. Not "unlikely" — impossible, in the
  // database, rather than by a read-then-write that two simultaneous clicks would
  // walk straight through. Multikey over `heldSlots` so a two-hour booking is guarded
  // on both its hours, not just its start: two bookings collide the moment they share
  // any one slot. Filtered on the presence of `holdsSlot` rather than on the status,
  // because an index filter cannot ask "is the status one of these three"; see that
  // field's own note.
  {
    key: { professional: 1, heldSlots: 1 },
    unique: true,
    partialFilterExpression: { holdsSlot: { $type: 'bool' } },
  },
  // The vet's console: everything booked with me, soonest first.
  { key: { professionalUser: 1, startsAt: -1 } },
  // An owner's own bookings.
  { key: { client: 1, startsAt: -1 } },
];
