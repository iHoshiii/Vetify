import { APPOINTMENT_NO_SHOW_GRACE_MINUTES } from '@shared/limits';
import type { AppointmentDocument } from '../models';
import { newAppointmentDelivery } from './appointment-deliveries.service';

export function reviewDeliveryFor(appointment: AppointmentDocument) {
  if (appointment.rating != null || appointment.reviewPromptSentAt != null) return undefined;
  if (
    appointment.kind !== 'onsite' &&
    appointment.consultedAt == null &&
    appointment.clientJoinedAt == null
  ) {
    return undefined;
  }
  const delivery = newAppointmentDelivery('review', appointment.startsAt, '');
  if (appointment.kind === 'virtual' && appointment.consultedAt == null) {
    delivery.availableAt = new Date(
      Math.max(
        Date.now(),
        appointment.startsAt.getTime() + APPOINTMENT_NO_SHOW_GRACE_MINUTES * 60_000
      )
    );
  }
  return delivery;
}
