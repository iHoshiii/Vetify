import type { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentsCollection } from './collection';
import type { AppointmentDocument } from './types';

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
