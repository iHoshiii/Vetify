import { findProfessionalById, findUserById, type AppointmentDocument } from '../models';
import type { AppointmentDelivery } from '../models/appointments/delivery-types';
import {
  cancelledEmail,
  confirmedEmail,
  declinedEmail,
  requestedToProfessionalEmail,
  reviewRequestEmail,
} from './appointment-mail';
import type { MailMessage } from './mail.service';

export async function appointmentDeliveryMail(
  appointment: AppointmentDocument,
  task: AppointmentDelivery
): Promise<MailMessage | null> {
  const application = await findProfessionalById(appointment.professional);
  const petName = appointment.petName ?? 'your pet';
  const shared = { kind: appointment.kind, startsAt: task.startsAt, petName };
  let message: MailMessage | null = null;
  if (task.action === 'requested') {
    const vet = await findUserById(appointment.professionalUser);
    if (vet)
      message = requestedToProfessionalEmail({
        ...shared,
        to: vet.email,
        name: application?.fullName || vet.name || 'your vet',
        petSpecies: appointment.petSpecies,
        reason: appointment.reason,
        phone: appointment.phone,
        clientName: task.actorName,
      });
  } else if (task.action === 'cancelled') {
    const byClient = appointment.cancelledBy?.equals(appointment.client) ?? false;
    const other = await findUserById(byClient ? appointment.professionalUser : appointment.client);
    if (other)
      message = cancelledEmail({
        ...shared,
        to: other.email,
        name: other.name ?? '',
        cancelledByName: task.actorName,
        reason: task.reason ?? '',
        forProfessional: byClient,
      });
  } else {
    const owner = await findUserById(appointment.client);
    const to =
      task.action === 'review' ? owner?.email ?? appointment.clientEmail : appointment.clientEmail;
    if (to) {
      const details = {
        ...shared,
        to,
        name: owner?.name ?? '',
        professionalName: application?.fullName || task.actorName || 'your vet',
      };
      message =
        task.action === 'confirmed'
          ? confirmedEmail(details)
          : task.action === 'declined'
          ? declinedEmail({ ...details, reason: task.reason ?? '' })
          : task.action === 'review'
          ? reviewRequestEmail(details)
          : null;
    }
  }
  return message ? { ...message, idempotencyKey: `appointment/${task.id.toString()}` } : null;
}
