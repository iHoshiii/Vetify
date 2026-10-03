import { findProfessionalById, type AppointmentDocument } from '../models';
import type { AppointmentDelivery } from '../models/appointments/delivery-types';
import { createNotification } from './notifications.service';

export async function appointmentDeliveryNotification(
  appointment: AppointmentDocument,
  task: AppointmentDelivery
): Promise<void> {
  const pet = appointment.petName ?? 'your pet';
  const shared = {
    id: task.id,
    appointment: appointment._id,
    appointmentKind: appointment.kind,
  };
  if (task.action === 'requested') {
    await createNotification({
      ...shared,
      user: appointment.professionalUser,
      kind: 'booking_requested',
      title: `New appointment request for ${pet}`,
      body: `${task.actorName} requested a ${
        appointment.kind === 'virtual' ? 'online consultation' : 'clinic visit'
      }.`,
    });
  } else if (task.action === 'confirmed' || task.action === 'declined') {
    const confirmed = task.action === 'confirmed';
    const application = await findProfessionalById(appointment.professional);
    const vetName = application?.fullName || task.actorName;
    await createNotification({
      ...shared,
      user: appointment.client,
      kind: confirmed ? 'booking_confirmed' : 'booking_declined',
      title: confirmed ? 'Appointment confirmed' : 'Appointment declined',
      body: `${vetName} ${task.action} ${pet}'s appointment.`,
    });
  } else if (task.action === 'reminder') {
    await createNotification({
      ...shared,
      user: appointment.professionalUser,
      kind: 'booking_reminder',
      title: 'Appointment starting soon',
      body: `${pet}'s appointment starts in about ${Math.max(
        1,
        Math.round((task.startsAt.getTime() - Date.now()) / 60_000)
      )} minutes.`,
    });
  } else if (task.action === 'review') {
    const application = await findProfessionalById(appointment.professional);
    await createNotification({
      ...shared,
      user: appointment.client,
      kind: 'review_request',
      title: 'How was your visit?',
      body: `Rate ${pet}'s visit with ${application?.fullName || task.actorName || 'your vet'}.`,
    });
  } else if (task.action === 'rated' && appointment.rating != null) {
    await createNotification({
      ...shared,
      user: appointment.professionalUser,
      kind: 'appointment_rated',
      title: `New ${appointment.rating}-star rating`,
      body: `${task.actorName} left a rating on their visit.`,
    });
  }
}
