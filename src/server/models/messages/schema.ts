import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { isValidObjectId } from '../object-id';

// What the database needs to open a thread. The three ids the service resolves from the listing.
export const threadAttrsSchema = z.object({
  professional: z.custom<string | ObjectId>(isValidObjectId, 'A professional is required'),
  professionalUser: z.custom<string | ObjectId>(isValidObjectId, 'The vet account is required'),
  client: z.custom<string | ObjectId>(isValidObjectId, 'The person messaging is required'),
});

// What the database needs to store one message. The body floor lives in the shared send schema.
export const messageAttrsSchema = z.object({
  thread: z.custom<string | ObjectId>(isValidObjectId, 'A thread is required'),
  sender: z.custom<string | ObjectId>(isValidObjectId, 'A sender is required'),
  body: z.string().trim().min(1),
});

export type ThreadAttrs = z.input<typeof threadAttrsSchema>;
export type MessageAttrs = z.input<typeof messageAttrsSchema>;
