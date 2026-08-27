import { PROFESSIONAL_ADDRESS_KINDS } from '@shared/schemas';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

import { isValidObjectId } from '../object-id';
import { PROFESSIONAL_STATUSES } from './types';

/** A device reading, as the repository is handed it. */
const locationFixSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number(),
  capturedAt: z.union([z.string(), z.date()]),
});

/**
 * One address. The bounds on each line, and the rule that a home address needs a
 * fix, live in `professionalApplySchema` (@shared/schemas) with the rest of the
 * form's rules — what is left here is the shape the document has to have.
 */
const addressSchema = z.object({
  kind: z.enum(PROFESSIONAL_ADDRESS_KINDS),
  line1: z.string().trim().min(1, 'An address needs a street line'),
  city: z.string().trim().min(1, 'An address needs a city'),
  province: z.string().trim().min(1, 'An address needs a province'),
  postalCode: z.string().trim().min(1).nullish(),
  fix: locationFixSchema.nullish(),
});

/**
 * What the database needs in order to hold an application, which is not what the
 * product asks an applicant for. The length rules, the URL check, the licence
 * normalisation and the capture freshness window live in `professionalApplySchema`
 * (@shared/schemas) so the form and the route validator share one copy —
 * restating them here would give two places to change and one to forget.
 *
 * What is left is the part no caller may skip, including the callers that never
 * pass through the route: a user that is a real id, a name to check against a
 * register, at least one address, and a status that is one of the five.
 *
 * `clinicAddress` is absent on purpose. It is the one line the directory
 * publishes, and it is derived from the addresses rather than supplied, so no
 * caller can put a house number on a public listing by sending one.
 */
export const professionalAttrsSchema = z.object({
  user: z.custom<string | ObjectId>(isValidObjectId, 'Applicant is required'),
  fullName: z.string().trim().min(1, 'The name on the license is required'),
  licenseNumber: z.string().trim().min(1, 'License number is required'),
  licenseAuthority: z.string().trim().min(1, 'License authority is required'),
  credentialUrls: z.array(z.string().trim().min(1)).nullish(),
  specialties: z.array(z.string().trim().min(1)).nullish(),
  clinicName: z.string().trim().min(1).nullish(),
  addresses: z.array(addressSchema).min(1, 'At least one address is required'),
  businessPhone: z.string().trim().min(1).nullish(),
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

/**
 * One address as the schema hands it back, which is not quite what it was given:
 * an absent `postalCode` or `fix` stays absent rather than becoming null, and the
 * fix's timestamp may still be a string. Derived from the schema rather than
 * written out beside it, so the repository's conversion cannot drift from the
 * shape it converts.
 */
export type ProfessionalAttrsAddress = z.output<typeof addressSchema>;
