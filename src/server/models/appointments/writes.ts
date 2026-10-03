import { APPOINTMENT_LIVE_STATUSES } from '@shared/schemas';
import type { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentsCollection } from './collection';
import { findAppointmentById } from './reads';
import type { AppointmentDocument, AppointmentStatus } from './types';
import { appointmentExpectation, type AppointmentExpectation } from './expectation';
import type { AppointmentDelivery } from './delivery-types';

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

export async function updateAppointment(
  id: string | ObjectId,
  patch: AppointmentPatch,
  expected?: AppointmentExpectation,
  delivery?: AppointmentDelivery
): Promise<AppointmentDocument | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return await findAppointmentById(_id);

  return await appointmentsCollection().findOneAndUpdate(
    { _id, ...(expected ? appointmentExpectation(expected) : {}) },
    {
      $set: { ...patch, updatedAt: new Date() },
      ...(patch.status ? { $inc: { revision: 1 } } : {}),
      ...(delivery ? { $push: { deliveries: delivery } } : {}),
    },
    { returnDocument: 'after' }
  );
}

// The new span a reschedule writes: where it now starts, and the hours it now holds.
export type RescheduleFields = { startsAt: Date; heldSlots: Date[] };

// Moves a booking onto a new span and puts it back to a fresh request. Replacing heldSlots frees the old hours and claims the new ones in one write, so the unique index rejects a slot another live booking holds; the route turns that into the same 409 a first booking gets.
export async function moveAppointment(
  id: string | ObjectId,
  fields: RescheduleFields,
  expected: AppointmentExpectation,
  delivery?: AppointmentDelivery
): Promise<AppointmentDocument | null> {
  if (!['requested', 'confirmed'].includes(expected.status)) return null;
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    { _id: toObjectId(id), ...appointmentExpectation(expected) },
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
      $inc: { revision: 1 },
      ...(delivery ? { $push: { deliveries: delivery } } : {}),
    },
    { returnDocument: 'after' }
  );
}
export function holdsSlotFor(status: AppointmentStatus): boolean {
  return (APPOINTMENT_LIVE_STATUSES as readonly string[]).includes(status);
}
