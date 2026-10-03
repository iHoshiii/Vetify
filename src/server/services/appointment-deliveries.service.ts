import { ObjectId } from 'mongodb';
import type { AppointmentDocument } from '../models';
import {
  claimAppointmentDelivery,
  findDueAppointmentDeliveries,
  releaseAppointmentDelivery,
  saveDeliveryProgress,
} from '../models/appointments/deliveries';
import type {
  AppointmentDelivery,
  AppointmentDeliveryAction,
} from '../models/appointments/delivery-types';
import { emitToUser } from '../realtime/hub';
import { appointmentDeliveryMail } from './appointment-delivery-mail';
import { appointmentDeliveryNotification } from './appointment-delivery-notification';
import { deliverMail, type MailDelivery } from './mail.service';

export function newAppointmentDelivery(
  action: AppointmentDeliveryAction,
  startsAt: Date,
  actorName: string,
  reason: string | null = null
): AppointmentDelivery {
  return {
    id: new ObjectId(),
    action,
    startsAt,
    actorName,
    reason,
    notificationPending: action !== 'cancelled',
    mailPending: action !== 'reminder',
    availableAt: new Date(),
    leaseUntil: null,
    leaseToken: null,
    attempts: 0,
  };
}

export function announceAppointment(appointment: AppointmentDocument): void {
  try {
    const payload = { id: appointment._id.toString() };
    emitToUser(appointment.client.toString(), 'appointment:changed', payload);
    emitToUser(appointment.professionalUser.toString(), 'appointment:changed', payload);
  } catch (error) {
    console.error('[appointments] change notice failed', error);
  }
}

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
        (task.action === 'review' && (stale || appointment.status !== 'completed'))
      ) {
        await save({ notificationPending: false, mailPending: false });
        mail = null;
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

export async function scanAppointmentDeliveries(): Promise<void> {
  const due = await findDueAppointmentDeliveries(new Date());
  for (const appointment of due) {
    for (const task of appointment.deliveries ?? []) {
      if (task.availableAt.getTime() <= Date.now())
        await processAppointmentDelivery(appointment, task.id);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startAppointmentDeliveryScanner(): void {
  if (timer) return;
  timer = setInterval(() => {
    void scanAppointmentDeliveries().catch((error) =>
      console.error('[appointments] delivery scan failed', error)
    );
  }, 30_000);
  timer.unref();
}

export function stopAppointmentDeliveryScanner(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
