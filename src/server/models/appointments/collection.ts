import type { Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { APPOINTMENTS_COLLECTION, type AppointmentDocument } from './types';

export function appointmentsCollection(): Collection<AppointmentDocument> {
  return getDb().collection<AppointmentDocument>(APPOINTMENTS_COLLECTION);
}
