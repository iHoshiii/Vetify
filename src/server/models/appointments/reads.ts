import { APPOINTMENT_PAGE_SIZE } from '@shared/limits';
import type { ObjectId, Filter } from 'mongodb';
import { toObjectId } from '../object-id';
import { appointmentsCollection } from './collection';
import type { AppointmentDocument, AppointmentKind, AppointmentStatus } from './types';

export async function findAppointmentById(
  id: string | ObjectId
): Promise<AppointmentDocument | null> {
  return await appointmentsCollection().findOne({ _id: toObjectId(id) });
}

export async function findHeldSlots(input: {
  professional: string | ObjectId;
  from: Date;
  to: Date;
}): Promise<Date[]> {
  const rows = await appointmentsCollection()
    .find(
      {
        professional: toObjectId(input.professional),
        holdsSlot: { $type: 'bool' },
        // Any held hour in the window, not the start: a two-hour booking that began
        // the hour before the range still occupies a slot inside it.
        heldSlots: { $elemMatch: { $gte: input.from, $lt: input.to } },
      },
      { projection: { heldSlots: 1 } }
    )
    .toArray();

  // Flattened to the individual hours, so the grid marks the second hour of a
  // two-hour booking taken as surely as the first.
  return rows.flatMap((row) => row.heldSlots ?? []);
}

export type FindAppointmentsOptions = {
  client?: string | ObjectId;
  professionalUser?: string | ObjectId;
  // One status, or the several a single tab stands for
  status?: AppointmentStatus | readonly AppointmentStatus[];
  kind?: AppointmentKind;
  page?: number;
  limit?: number;
};

export async function findAppointments(
  options: FindAppointmentsOptions
): Promise<{ items: AppointmentDocument[]; total: number }> {
  const {
    client,
    professionalUser,
    status,
    kind,
    page = 1,
    limit = APPOINTMENT_PAGE_SIZE,
  } = options;

  const filter: Filter<AppointmentDocument> = {};
  if (client) filter.client = toObjectId(client);
  if (professionalUser) filter.professionalUser = toObjectId(professionalUser);
  if (status) filter.status = Array.isArray(status) ? { $in: [...status] } : status;
  if (kind) filter.kind = kind;

  const now = new Date();

  const [items, total] = await Promise.all([
    appointmentsCollection()
      .aggregate<AppointmentDocument>([
        { $match: filter },
        {
          $addFields: {
            _past: { $cond: [{ $lt: ['$startsAt', now] }, 1, 0] },
            _absDiff: { $abs: { $subtract: ['$startsAt', now] } },
          },
        },
        { $sort: { _past: 1, _absDiff: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _past: 0, _absDiff: 0 } },
      ])
      .toArray(),
    appointmentsCollection().countDocuments(filter),
  ]);

  return { items, total };
}
