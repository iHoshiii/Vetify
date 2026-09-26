import type { User } from '../models';
import {
  findAppointmentById,
  replyToReview as recordReviewReply,
  type AppointmentDocument,
} from '../models';
import { AppError } from '../utils/AppError';

export type ReplyToReviewInput = {
  id: string;
  // The vet answering. Only the account the booking is with may reply.
  actor: User;
  reply: string;
};

// The vet's one public response to a rated visit. Ownership and the rated-once guard are checked here against the stored booking and again in the write's filter, so a racing edit cannot slip a reply onto someone else's review. Null for a booking that does not exist.
export async function replyToReview(
  input: ReplyToReviewInput
): Promise<AppointmentDocument | null> {
  const { id, actor, reply } = input;

  const current = await findAppointmentById(id);
  if (!current) return null;

  // Not the owner, not a bystander: only the vet the review is about may answer it.
  if (!current.professionalUser.equals(actor._id)) {
    throw AppError.forbidden('That is not your appointment');
  }

  if (current.rating === null) {
    throw AppError.conflict('You can only reply to a visit that has been rated');
  }

  const text = reply.trim();
  if (!text) {
    throw AppError.badRequest('Write a reply before posting it');
  }

  return await recordReviewReply({ id, professionalUser: actor._id, reply: text });
}
