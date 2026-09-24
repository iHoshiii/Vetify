import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { isValidObjectId } from '../object-id';
import { NOTIFICATION_KINDS } from './types';

// What the store needs to record one notification. Title and body are composed by the service, never sent by a client.
export const notificationAttrsSchema = z.object({
  user: z.custom<string | ObjectId>(isValidObjectId, 'A recipient is required'),
  kind: z.enum(NOTIFICATION_KINDS),
  appointment: z.custom<string | ObjectId>(isValidObjectId, 'An appointment is required'),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

export type NotificationAttrs = z.input<typeof notificationAttrsSchema>;
