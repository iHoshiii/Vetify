import { APPOINTMENT_MAX_SLOTS, APPOINTMENT_SLOT_MINUTES } from '@shared/limits';
import type { AppointmentKind } from '@shared/schemas';
import type { ObjectId } from 'mongodb';
import {
  findProfessionalById,
  insertAppointment,
  type AppointmentDocument,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import {
  announceAppointment,
  newAppointmentDelivery,
  processAppointmentDelivery,
} from './appointment-deliveries.service';
import { appointmentRequestFingerprint, findRepeatedAppointment } from './appointment-request-key';
import { isOfferedSpan, scheduleForKind, slotStarts } from './appointment-slots';
import type { MailDelivery } from './mail.service';

export type RequestAppointmentInput = {
  client: User;
  professionalId: string | ObjectId;
  kind: AppointmentKind;
  startsAt: Date;
  requestId?: string;
  slots?: number;
  petName?: string | null;
  petSpecies: string;
  petBreed?: string | null;
  petAge?: string | null;
  reason: string;
  phone?: string | null;
  clientEmail?: string | null;
};

export type RequestAppointmentResult = {
  appointment: AppointmentDocument;
  mail: { professional: MailDelivery };
};

async function resultFor(appointment: AppointmentDocument): Promise<RequestAppointmentResult> {
  const task = appointment.deliveries?.find((delivery) => delivery.action === 'requested');
  const professional =
    task && appointment.status === 'requested'
      ? await processAppointmentDelivery(appointment, task.id)
      : { delivered: true, deliveryError: null };
  return {
    appointment,
    mail: {
      professional: professional ?? {
        delivered: false,
        deliveryError: 'That vet no longer has an account',
      },
    },
  };
}

export async function requestAppointment(
  input: RequestAppointmentInput
): Promise<RequestAppointmentResult | null> {
  const { client, professionalId, kind, startsAt, petSpecies, reason } = input;
  const slots = Math.max(1, Math.min(input.slots ?? 1, APPOINTMENT_MAX_SLOTS));
  const fingerprint = appointmentRequestFingerprint(input, slots);
  const repeated = await findRepeatedAppointment(input, fingerprint);
  if (repeated) return resultFor(repeated);
  const application = await findProfessionalById(professionalId);
  if (!application || application.status !== 'verified') return null;
  if (application.user.equals(client._id)) {
    throw AppError.badRequest('You cannot book an appointment with yourself');
  }
  if ((application.availabilityStatus ?? 'available') !== 'available') {
    throw AppError.conflict('That vet is not taking bookings at the moment');
  }
  const placeFor = kind === 'onsite' ? 'clinic' : 'home';
  if (!(application.addresses ?? []).some((address) => address.kind === placeFor)) {
    throw AppError.badRequest('That vet does not offer that kind of appointment');
  }
  if (
    !isOfferedSpan({
      schedule: scheduleForKind(application, kind),
      startsAt,
      minutes: APPOINTMENT_SLOT_MINUTES,
      slots,
    })
  ) {
    throw AppError.badRequest('That time is not one of the slots on offer');
  }
  const delivery = newAppointmentDelivery(
    'requested',
    startsAt,
    client.name || client.email || 'A pet owner'
  );
  let appointment: AppointmentDocument;
  try {
    appointment = await insertAppointment({
      professional: application._id,
      professionalUser: application.user,
      client: client._id,
      kind,
      startsAt,
      minutes: APPOINTMENT_SLOT_MINUTES * slots,
      heldSlots: slotStarts(startsAt, APPOINTMENT_SLOT_MINUTES, slots),
      petName: input.petName?.trim() || null,
      petSpecies,
      petBreed: input.petBreed?.trim() || null,
      petAge: input.petAge?.trim() || null,
      reason,
      phone: input.phone ?? null,
      clientEmail: input.clientEmail?.trim().toLowerCase() || null,
      requestId: input.requestId,
      requestFingerprint: fingerprint,
      deliveries: [delivery],
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000 && input.requestId) {
      const saved = await findRepeatedAppointment(input, fingerprint);
      if (saved) return resultFor(saved);
    }
    throw error;
  }
  announceAppointment(appointment);
  return resultFor(appointment);
}
