import { APPOINTMENT_KINDS } from '@shared/schemas';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { isValidObjectId } from '../object-id';

/**
 * What the database needs in order to hold a booking, which is not what the form
 * asks for. The length floors, the phone shape and the "pick a slot we offered"
 * rule live in `appointmentRequestSchema` (@shared/schemas) so the form and the
 * route validator share one copy — restating them here would give two places to
 * change and one to forget.
 *
 * What is left is the part no caller may skip, including the callers that never
 * come through the route: a test, a seed script, an import of a backlog somebody
 * kept in a spreadsheet.
 *
 * `status` and `holdsSlot` are absent on purpose. Every booking starts as a request
 * that holds its slot, and letting a caller supply either would let one arrive
 * already confirmed, or occupying a slot nobody can see it in.
 */
export const appointmentAttrsSchema = z.object({
  professional: z.custom<string | ObjectId>(isValidObjectId, 'A professional is required'),
  professionalUser: z.custom<string | ObjectId>(isValidObjectId, 'The vet account is required'),
  client: z.custom<string | ObjectId>(isValidObjectId, 'The person booking is required'),
  kind: z.enum(APPOINTMENT_KINDS),
  startsAt: z.date(),
  minutes: z.number().int().positive(),
  petName: z.string().trim().min(1, 'Whose visit is this?'),
  petSpecies: z.string().trim().min(1, 'What kind of animal?'),
  reason: z.string().trim().min(1, 'Say what it is about'),
  phone: z.string().trim().min(1).nullish(),
});

export type AppointmentAttrs = z.input<typeof appointmentAttrsSchema>;
