import type { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentsCollection } from './collection';
import type { AppointmentDocument } from './types';
import { appointmentExpectation, type AppointmentExpectation } from './expectation';
import type { AppointmentDelivery } from './delivery-types';

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
export async function claimReminder(
  id: string | ObjectId,
  expected?: AppointmentExpectation,
  delivery?: AppointmentDelivery
): Promise<AppointmentDocument | null> {
  if (expected && expected.status !== 'confirmed') return null;
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    {
      _id: toObjectId(id),
      reminderSentAt: null,
      status: 'confirmed',
      ...(expected ? appointmentExpectation(expected) : {}),
      startsAt: expected?.startsAt ?? { $gt: now },
    },
    {
      $set: { reminderSentAt: now, updatedAt: now },
      ...(delivery ? { $push: { deliveries: delivery } } : {}),
    },
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
  id: string | ObjectId,
  expected?: AppointmentExpectation,
  delivery?: AppointmentDelivery
): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    {
      _id: toObjectId(id),
      ...(expected ? appointmentExpectation(expected) : {}),
      status: 'confirmed',
      $expr: { $lte: [{ $add: ['$startsAt', { $multiply: ['$minutes', 60_000] }] }, now] },
    },
    {
      $set: {
        status: 'completed',
        decidedAt: now,
        updatedAt: now,
        ...(delivery ? { reviewPromptSentAt: now } : {}),
      },
      $inc: { revision: 1 },
      ...(delivery ? { $push: { deliveries: delivery } } : {}),
    },
    { returnDocument: 'after' }
  );
}
