import { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentAttrsSchema, type AppointmentAttrs } from './schema';
import { appointmentsCollection } from './collection';
import type { AppointmentDocument } from './types';

export async function insertAppointment(attrs: AppointmentAttrs): Promise<AppointmentDocument> {
  const parsed = appointmentAttrsSchema.parse(attrs);
  const now = new Date();

  const doc: AppointmentDocument = {
    _id: new ObjectId(),
    revision: 0,
    ...(attrs.requestId
      ? { requestId: attrs.requestId, requestFingerprint: attrs.requestFingerprint }
      : {}),
    deliveries: attrs.deliveries ?? [],
    professional: toObjectId(parsed.professional),
    professionalUser: toObjectId(parsed.professionalUser),
    client: toObjectId(parsed.client),
    kind: parsed.kind,
    startsAt: parsed.startsAt,
    minutes: parsed.minutes,
    heldSlots: parsed.heldSlots,
    status: 'requested',
    // Set on the way in and nulled when the booking lets go. This is the field the
    // unique index actually watches.
    holdsSlot: true,
    petName: parsed.petName ?? null,
    petSpecies: parsed.petSpecies,
    petBreed: parsed.petBreed ?? null,
    petAge: parsed.petAge ?? null,
    reason: parsed.reason,
    phone: parsed.phone ?? null,
    clientEmail: parsed.clientEmail ?? null,
    meetingUrl: null,
    refusalReason: null,
    cancelledBy: null,
    decidedAt: null,
    reminderSentAt: null,
    reviewPromptSentAt: null,
    joinedAt: null,
    consultedAt: null,
    clientJoinedAt: null,
    rating: null,
    ratingComment: null,
    ratedAt: null,
    reviewReply: null,
    reviewReplyAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await appointmentsCollection().insertOne(doc);
  return doc;
}
