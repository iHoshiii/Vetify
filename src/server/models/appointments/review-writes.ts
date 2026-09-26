import type { ObjectId } from 'mongodb';

import { toObjectId } from '../object-id';
import { appointmentsCollection } from './repository';
import type { AppointmentDocument } from './types';

// Claims a booking's post-visit review nudge atomically, so two ticks or two instances cannot both send it. The null-or-missing guard covers rows made before the field.
export async function claimReviewPrompt(
  id: string | ObjectId
): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    { _id: toObjectId(id), reviewPromptSentAt: null },
    { $set: { reviewPromptSentAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
}

// Records the vet's public reply to their own rated review, guarded on the account match and on the booking being rated, so a reply cannot land on someone else's review or on stars that were never left. Returns null when neither condition holds.
export async function replyToReview(input: {
  id: string | ObjectId;
  professionalUser: string | ObjectId;
  reply: string;
}): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    {
      _id: toObjectId(input.id),
      professionalUser: toObjectId(input.professionalUser),
      rating: { $ne: null },
    },
    { $set: { reviewReply: input.reply, reviewReplyAt: now, updatedAt: now } },
    { returnDocument: 'after' }
  );
}

// Strips the stars and note off a booking when an admin removes an abusive review, leaving the reply untouched so a vet's response is not orphaned onto nothing.
export async function clearAppointmentRating(
  id: string | ObjectId
): Promise<AppointmentDocument | null> {
  const now = new Date();
  return await appointmentsCollection().findOneAndUpdate(
    { _id: toObjectId(id) },
    { $set: { rating: null, ratingComment: null, updatedAt: now } },
    { returnDocument: 'after' }
  );
}
