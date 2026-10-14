import type { Filter } from 'mongodb';
import type { AppointmentDocument } from './types';

export type AppointmentExpectation = Pick<AppointmentDocument, 'status' | 'startsAt' | 'revision'>;

export function appointmentExpectation(
  current: AppointmentExpectation
): Filter<AppointmentDocument> {
  return {
    status: current.status,
    startsAt: current.startsAt,
    revision: current.revision ?? { $exists: false },
  };
}
