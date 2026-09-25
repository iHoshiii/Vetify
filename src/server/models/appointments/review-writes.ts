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
