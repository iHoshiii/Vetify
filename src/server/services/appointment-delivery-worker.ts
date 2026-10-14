import type { ObjectId } from 'mongodb';
import type { AppointmentDocument } from '../models';
import {
  claimAppointmentDelivery,
  releaseAppointmentDelivery,
  saveDeliveryProgress,
} from '../models/appointments/deliveries';
import { refreshProfessionalRating } from '../models/appointments/rating-summary';
import { appointmentDeliveryMail } from './appointment-delivery-mail';
import { appointmentDeliveryNotification } from './appointment-delivery-notification';
import { deliverMail, type MailDelivery } from './mail.service';

export async function processAppointmentDelivery(
  appointment: AppointmentDocument,
  delivery: ObjectId
): Promise<MailDelivery | null> {
  const pending: MailDelivery = {
    delivered: false,
    deliveryError: 'Notification delivery is queued for retry',
  };
  try {
    const claimed = await claimAppointmentDelivery(appointment._id, delivery);
    if (!claimed)
      return appointment.deliveries?.some((task) => task.id.equals(delivery) && task.mailPending)
        ? pending
        : { delivered: true, deliveryError: null };
    const { task, leaseToken } = claimed;
    appointment = claimed.appointment;
    let mail: MailDelivery | null = task.mailPending
      ? pending
      : { delivered: true, deliveryError: null };
    const save = async (progress: Parameters<typeof saveDeliveryProgress>[3]) => {
      if (!(await saveDeliveryProgress(appointment._id, task.id, leaseToken, progress))) {
        throw new Error('Appointment delivery lease expired');
      }
      Object.assign(task, progress);
    };
    try {
      const stale = task.startsAt.getTime() !== appointment.startsAt.getTime();
      const statusTask = ['requested', 'confirmed', 'declined', 'cancelled'].includes(task.action);
      if (
        (statusTask && (stale || task.action !== appointment.status)) ||
        (task.action === 'reminder' &&
          (stale || appointment.status !== 'confirmed' || task.startsAt.getTime() <= Date.now())) ||
        (task.action === 'review' &&
          (stale || appointment.status !== 'completed' || appointment.rating != null))
      ) {
        await save({ notificationPending: false, mailPending: false });
        mail = null;
      }
      if (task.summaryPending) {
        try {
          await refreshProfessionalRating(appointment.professional);
          await save({ summaryPending: false });
        } catch (error) {
          console.error('[appointments] rating summary queued for retry', error);
        }
      }
      if (task.notificationPending) {
        try {
          await appointmentDeliveryNotification(appointment, task);
          await save({ notificationPending: false });
        } catch (error) {
          console.error('[appointments] notification queued for retry', error);
        }
      }
      if (task.mailPending) {
        try {
          const message = task.mailMessage ?? (await appointmentDeliveryMail(appointment, task));
          if (message) {
            if (!task.mailMessage) await save({ mailMessage: message });
            mail = await deliverMail(message);
            if (mail.delivered) await save({ mailPending: false });
          } else {
            mail = null;
            await save({ mailPending: false });
          }
        } catch (error) {
          console.error('[appointments] email queued for retry', error);
        }
      }
    } finally {
      await releaseAppointmentDelivery(appointment._id, task, leaseToken);
    }
    return mail;
  } catch (error) {
    console.error('[appointments] delivery remains queued', error);
    return pending;
  }
}
