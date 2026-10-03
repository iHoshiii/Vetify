import { APPOINTMENT_NO_SHOW_GRACE_MINUTES } from '@shared/limits';
import type { ObjectId } from 'mongodb';
import {
  averageRatingForProfessional,
  findAppointmentById,
  rateAppointment as recordAppointmentRating,
  setProfessionalRating,
  type AppointmentDocument,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import { createNotification } from './notifications.service';
import { announceAppointment } from './appointment-deliveries.service';

export type RateAppointmentInput = {
  id: string | ObjectId;
  actor: User;
  rating: number;
  comment?: string | null;
};
export async function rateAppointment(
  input: RateAppointmentInput
): Promise<AppointmentDocument | null> {
  const { id, actor, rating, comment = null } = input;

  const current = await findAppointmentById(id);
  if (!current) return null;
  if (!current.client.equals(actor._id)) {
    throw AppError.forbidden('That is not your appointment');
  }
  const noShow =
    current.kind === 'virtual' &&
    current.consultedAt === null &&
    current.clientJoinedAt !== null &&
    Date.now() - current.startsAt.getTime() >= APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60_000;
  const rateable =
    (current.status === 'completed' && current.kind === 'onsite') ||
    (current.kind === 'virtual' && current.consultedAt !== null) ||
    noShow;
  if (!rateable) {
    throw AppError.conflict('You can only rate a consultation once it has taken place');
  }

  if (current.rating !== null) {
    throw AppError.conflict('You have already rated this appointment');
  }

  const rated = await recordAppointmentRating(id, rating, comment);
  if (!rated) return null;

  const summary = await averageRatingForProfessional(rated.professional);
  await setProfessionalRating(rated.professional, summary);
  try {
    await createNotification({
      user: rated.professionalUser,
      kind: 'appointment_rated',
      appointment: rated._id,
      appointmentKind: rated.kind,
      title: `New ${rating}-star rating`,
      body: `${actor.name || 'A pet owner'} left a rating on their visit.`,
    });
  } catch (err) {
    console.error('[appointments] rating notification failed', err);
  }

  announceAppointment(rated);

  return rated;
}
