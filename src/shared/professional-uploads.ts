import { z } from 'zod';
import { PROFESSIONAL_PHOTO_KINDS } from './limits';

export const professionalPhotoKindSchema = z.enum(PROFESSIONAL_PHOTO_KINDS);
export const professionalUploadRefSchema = z.object({
  uploadId: z.string().regex(/^[a-f\d]{24}$/i),
  revision: z.string().regex(/^[a-f\d]{64}$/i),
});
export const professionalUploadRefsSchema = z.object({
  portrait: professionalUploadRefSchema,
  licenseFront: professionalUploadRefSchema,
  licenseBack: professionalUploadRefSchema,
});
export type ProfessionalUploadRef = z.infer<typeof professionalUploadRefSchema>;
