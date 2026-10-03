import type { ObjectId } from 'mongodb';
import {
  findAppointmentById,
  holdsSlotFor,
  updateAppointment,
  type AppointmentDocument,
  type AppointmentStatus,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import {
  announceAppointment,
  newAppointmentDelivery,
  processAppointmentDelivery,
} from './appointment-deliveries.service';
import type { MailDelivery } from './mail.service';

export type AppointmentDecision = 'confirmed' | 'declined' | 'completed';
const DECIDABLE_FROM: Record<AppointmentDecision, AppointmentStatus[]> = {
  confirmed: ['requested'],
  declined: ['requested'],
  completed: ['confirmed'],
};

export type DecideAppointmentInput = {
  id: string | ObjectId;
  decision: AppointmentDecision;
  professional: User;
  reason?: string | null;
};
export type DecideAppointmentResult = {
  appointment: AppointmentDocument;
  mail: MailDelivery | null;
};
export type CancelAppointmentInput = { id: string | ObjectId; actor: User; reason: string };
export type CancelAppointmentResult = DecideAppointmentResult;

async function moveTo(
  current: AppointmentDocument,
  status: AppointmentStatus,
  actor: User,
  extra: { refusalReason?: string | null; cancelledBy?: ObjectId | null } = {}
): Promise<DecideAppointmentResult> {
  const task =
    status === 'completed'
      ? undefined
      : newAppointmentDelivery(
          status as 'confirmed' | 'declined' | 'cancelled',
          current.startsAt,
          actor.name || actor.email,
          extra.refusalReason
        );
  const appointment = await updateAppointment(
    current._id,
    {
      status,
      holdsSlot: holdsSlotFor(status) ? true : null,
      decidedAt: new Date(),
      ...extra,
    },
    current,
    task
  );
  if (!appointment) {
    throw AppError.conflict(
      'This appointment has already changed. Refresh to see its latest details.',
      'appointment-changed'
    );
  }
  announceAppointment(appointment);
  const mail = task ? await processAppointmentDelivery(appointment, task.id) : null;
  return { appointment, mail };
}

export async function decideAppointment(
  input: DecideAppointmentInput
): Promise<DecideAppointmentResult | null> {
  const { id, decision, professional, reason = null } = input;
  const current = await findAppointmentById(id);
  if (!current) return null;
  if (!current.professionalUser.equals(professional._id)) {
    throw AppError.forbidden('That is not your appointment');
  }
  if (!DECIDABLE_FROM[decision].includes(current.status)) {
    throw AppError.conflict(`An appointment that is ${current.status} cannot be ${decision}`);
  }
  const stated = reason?.trim() || null;
  if (decision === 'declined' && !stated) {
    throw AppError.badRequest('A reason is required to turn an appointment down');
  }
  return moveTo(
    current,
    decision,
    professional,
    decision === 'declined' ? { refusalReason: stated } : {}
  );
}

export async function cancelAppointment(
  input: CancelAppointmentInput
): Promise<CancelAppointmentResult | null> {
  const { id, actor, reason } = input;
  const current = await findAppointmentById(id);
  if (!current) return null;
  if (!current.client.equals(actor._id) && !current.professionalUser.equals(actor._id)) {
    throw AppError.forbidden('That is not your appointment');
  }
  const stated = reason.trim();
  if (!stated) throw AppError.badRequest('A reason is required to cancel an appointment');
  if (!['requested', 'confirmed'].includes(current.status)) {
    throw AppError.conflict(`An appointment that is ${current.status} cannot be cancelled`);
  }
  return moveTo(current, 'cancelled', actor, { refusalReason: stated, cancelledBy: actor._id });
}
