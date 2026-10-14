import { APPOINTMENT_NO_SHOW_GRACE_MINUTES } from '@shared/limits';
import type { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentsCollection } from './collection';
import type { AppointmentDocument } from './types';
import type { AppointmentDelivery } from './delivery-types';

// Records the owner's stars and optional note on a consultation that has taken place. Rateable means an onsite booking that completed, a virtual one both parties actually connected on (consultedAt), or a virtual no-show the booker joined for once the grace past its start has passed. The rating:null guard makes the write idempotent, so a second submission cannot overwrite the first.
export async function rateAppointment(
  id: string | ObjectId,
  rating: number,
  comment: string | null,
  delivery?: AppointmentDelivery
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
    {
      $set: { rating, ratingComment: comment, ratedAt: now, updatedAt: now },
      ...(delivery ? { $push: { deliveries: delivery } } : {}),
    },
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
