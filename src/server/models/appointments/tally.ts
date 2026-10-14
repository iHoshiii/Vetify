import type { ObjectId } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentsCollection } from './collection';
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_STATUSES,
  type AppointmentKind,
  type AppointmentStatus,
} from './types';

// Bookings counted by kind and then status, every cell present
export type AppointmentTally = Record<AppointmentKind, Record<AppointmentStatus, number>>;

// Zero-filled, so a console reading a cell gets a number rather than undefined
function emptyTally(): AppointmentTally {
  const statuses = () =>
    Object.fromEntries(APPOINTMENT_STATUSES.map((status) => [status, 0])) as Record<
      AppointmentStatus,
      number
    >;
  return Object.fromEntries(
    APPOINTMENT_KINDS.map((kind) => [kind, statuses()])
  ) as AppointmentTally;
}
// One aggregate for all ten figures the console draws, none of which may come from the page of rows on screen
export async function tallyAppointments(
  professionalUser: string | ObjectId
): Promise<AppointmentTally> {
  const rows = await appointmentsCollection()
    .aggregate<{ _id: { kind: AppointmentKind; status: AppointmentStatus }; count: number }>([
      { $match: { professionalUser: toObjectId(professionalUser) } },
      { $group: { _id: { kind: '$kind', status: '$status' }, count: { $sum: 1 } } },
    ])
    .toArray();

  const tally = emptyTally();
  for (const row of rows) {
    const kind = tally[row._id.kind];
    if (kind && row._id.status in kind) kind[row._id.status] = row.count;
  }

  return tally;
}
