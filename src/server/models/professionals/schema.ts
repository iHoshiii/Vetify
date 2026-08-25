import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { isValidObjectId } from '../object-id';
import { PROFESSIONAL_STATUSES } from './types';

/**
 * What the database needs in order to hold an application, which is not what the
 * product asks an applicant for. The length rules, the URL check and the licence
 * normalisation live in `professionalApplySchema` (@shared/schemas) so the form
 * and the route validator share one copy — restating them here would give two
 * places to change and one to forget.
 *
 * What is left is the part no caller may skip, including the callers that never
 * pass through the route: a user that is a real id, and a status that is one of
 * the four.
 */
export const professionalAttrsSchema = z.object({
  user: z.custom<string | ObjectId>(isValidObjectId, 'Applicant is required'),
  licenseNumber: z.string().trim().min(1, 'License number is required'),
  licenseAuthority: z.string().trim().min(1, 'License authority is required'),
  credentialUrls: z.array(z.string().trim().min(1)).nullish(),
  specialties: z.array(z.string().trim().min(1)).nullish(),
  clinicName: z.string().trim().min(1, 'Clinic name is required'),
  clinicAddress: z.string().trim().min(1, 'Clinic address is required'),
  bio: z.string().trim().min(1, 'Bio is required'),
  yearsExperience: z.number().int().min(0).default(0),
  status: z.enum(PROFESSIONAL_STATUSES).default('pending'),
  /**
   * Whether consent was given. Stored as the date it was given; the flag is what
   * the caller has, so the repository converts.
   */
  backgroundCheckConsent: z.boolean().default(false),
});

export type ProfessionalAttrs = z.input<typeof professionalAttrsSchema>;
