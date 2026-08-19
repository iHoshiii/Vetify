import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { isValidObjectId } from '../object-id';

// mandatory and optional fields for creating a new pet document
export const petAttrsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  species: z.string().trim().min(1, 'Species is required'),
  breed: z.string().trim().min(1).nullish(),
  age: z.number().min(0, 'Age cannot be negative').nullish(),
  weight: z.number().min(0, 'Weight cannot be negative').nullish(),
  owner: z.custom<string | ObjectId>(isValidObjectId, 'Owner is required'),
  avatar: z
    .object({
      url: z.string().min(1).nullish(),
      color: z.string().trim().min(1),
      initials: z.boolean(),
    })
    .partial()
    .optional(),
});

export type PetAttrs = z.input<typeof petAttrsSchema>;
