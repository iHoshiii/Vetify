import { z } from 'zod';

/**
 * What the database needs in order to hold an enquiry, which is not what the
 * public form asks for. The length floors, the email check and the licence
 * normalisation live in `professionalInquirySchema` (@shared/schemas) so the form
 * and the route validator share one copy — restating them here would give two
 * places to change and one to forget.
 *
 * What is left is the part no caller may skip, including the callers that never
 * pass through the route: a seed script, a test, a future import of a backlog
 * somebody kept in a spreadsheet.
 */
export const professionalInquiryAttrsSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
  licenseNumber: z.string().trim().min(1, 'License number is required'),
  currentLocation: z.string().trim().min(1, 'Current location is required'),
  clinicLocation: z.string().trim().min(1).nullish(),
  motivation: z.string().trim().min(1, 'Tell us why you want to join'),
  phone: z.string().trim().min(1).nullish(),
  yearsExperience: z.number().int().min(0).nullish(),
});

export type ProfessionalInquiryAttrs = z.input<typeof professionalInquiryAttrsSchema>;
