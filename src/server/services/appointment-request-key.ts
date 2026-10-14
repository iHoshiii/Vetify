import { createHash } from 'node:crypto';
import { appointmentsCollection } from '../models/appointments/collection';
import { toObjectId } from '../models/object-id';
import { AppError } from '../utils/AppError';
import type { RequestAppointmentInput } from './appointment-request.service';

export function appointmentRequestFingerprint(
  input: RequestAppointmentInput,
  slots: number
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        professional: toObjectId(input.professionalId).toString(),
        kind: input.kind,
        startsAt: input.startsAt.toISOString(),
        slots,
        petName: input.petName?.trim() || null,
        petSpecies: input.petSpecies.trim(),
        petBreed: input.petBreed?.trim() || null,
        petAge: input.petAge?.trim() || null,
        reason: input.reason.trim(),
        phone: input.phone?.trim() || null,
        clientEmail: input.clientEmail?.trim().toLowerCase() || null,
      })
    )
    .digest('hex');
}

export async function findRepeatedAppointment(input: RequestAppointmentInput, fingerprint: string) {
  if (!input.requestId) return null;
  const saved = await appointmentsCollection().findOne({
    client: input.client._id,
    requestId: input.requestId,
  });
  if (saved && saved.requestFingerprint !== fingerprint) {
    throw AppError.conflict(
      'This booking request was already used with different details',
      'request-reused'
    );
  }
  return saved;
}
