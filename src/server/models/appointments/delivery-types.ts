import type { ObjectId } from 'mongodb';
import type { MailMessage } from '../../services/mail.service';

export type AppointmentDeliveryAction =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'reminder'
  | 'review';

export type AppointmentDelivery = {
  id: ObjectId;
  action: AppointmentDeliveryAction;
  startsAt: Date;
  reason: string | null;
  actorName: string;
  notificationPending: boolean;
  mailPending: boolean;
  mailMessage?: MailMessage;
  availableAt: Date;
  leaseUntil: Date | null;
  leaseToken: ObjectId | null;
  attempts: number;
};
