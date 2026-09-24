import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { APPOINTMENT_KINDS } from '@shared/schemas';
import { isValidObjectId } from '../object-id';
import { NOTIFICATION_KINDS } from './types';

// What the store needs to record one notification. Title and body are composed by the service, never sent by a client.
export const notificationAttrsSchema = z.object({
  user: z.custom<string | ObjectId>(isValidObjectId, 'A recipient is required'),
  kind: z.enum(NOTIFICATION_KINDS),
  appointment: z.custom<string | ObjectId>(isValidObjectId, 'An appointment is required'),
  appointmentKind: z.enum(APPOINTMENT_KINDS).optional(),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

export type NotificationAttrs = z.input<typeof notificationAttrsSchema>;
