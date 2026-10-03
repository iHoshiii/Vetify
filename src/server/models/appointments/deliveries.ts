import { ObjectId } from 'mongodb';
import { appointmentsCollection } from './collection';
import type { AppointmentDelivery } from './delivery-types';
import type { AppointmentDocument } from './types';

export async function findDueAppointmentDeliveries(now: Date): Promise<AppointmentDocument[]> {
  return appointmentsCollection()
    .find({
      deliveries: {
        $elemMatch: {
          availableAt: { $lte: now },
          $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
        },
      },
    })
    .limit(100)
    .toArray();
}

export async function claimAppointmentDelivery(appointment: ObjectId, delivery: ObjectId) {
  const now = new Date();
  const leaseToken = new ObjectId();
  const row = await appointmentsCollection().findOneAndUpdate(
    {
      _id: appointment,
      deliveries: {
        $elemMatch: {
          id: delivery,
          availableAt: { $lte: now },
          $or: [{ leaseUntil: null }, { leaseUntil: { $lte: now } }],
        },
      },
    },
    {
      $set: {
        'deliveries.$.leaseUntil': new Date(now.getTime() + 120_000),
        'deliveries.$.leaseToken': leaseToken,
      },
      $inc: { 'deliveries.$.attempts': 1 },
    },
    { returnDocument: 'after' }
  );
  const task = row?.deliveries?.find((item) => item.id.equals(delivery));
  return row && task ? { appointment: row, task, leaseToken } : null;
}

export async function saveDeliveryProgress(
  appointment: ObjectId,
  delivery: ObjectId,
  leaseToken: ObjectId,
  progress: Partial<
    Pick<AppointmentDelivery, 'notificationPending' | 'mailPending' | 'mailMessage'>
  >
): Promise<boolean> {
  const $set = Object.fromEntries(
    Object.entries(progress).map(([key, value]) => [`deliveries.$.${key}`, value])
  );
  const result = await appointmentsCollection().updateOne(
    {
      _id: appointment,
      deliveries: { $elemMatch: { id: delivery, leaseToken } },
    },
    { $set }
  );
  return result.matchedCount === 1;
}

export async function releaseAppointmentDelivery(
  appointment: ObjectId,
  task: AppointmentDelivery,
  leaseToken: ObjectId
): Promise<void> {
  const filter = { _id: appointment, deliveries: { $elemMatch: { id: task.id, leaseToken } } };
  if (!task.notificationPending && !task.mailPending) {
    await appointmentsCollection().updateOne(filter, { $pull: { deliveries: { id: task.id } } });
    return;
  }
  const delay = Math.min(3_600_000, 30_000 * 2 ** Math.min(task.attempts - 1, 7));
  await appointmentsCollection().updateOne(filter, {
    $set: {
      'deliveries.$.availableAt': new Date(Date.now() + delay),
      'deliveries.$.leaseUntil': null,
      'deliveries.$.leaseToken': null,
    },
  });
}
