import { ObjectId } from 'mongodb';
import type { AppointmentDocument } from '../models';
import { findDueAppointmentDeliveries } from '../models/appointments/deliveries';
import type {
  AppointmentDelivery,
  AppointmentDeliveryAction,
} from '../models/appointments/delivery-types';
import { emitToUser } from '../realtime/hub';
import { processAppointmentDelivery } from './appointment-delivery-worker';
export { processAppointmentDelivery } from './appointment-delivery-worker';

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
    notificationPending: action !== 'cancelled' && action !== 'rating_removed',
    mailPending: ['requested', 'confirmed', 'declined', 'cancelled', 'review'].includes(action),
    summaryPending: action === 'rated' || action === 'rating_removed',
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
