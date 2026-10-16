import { randomBytes } from 'node:crypto';
import { Binary, ObjectId, type IndexDescription } from 'mongodb';
import { PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES, PROFESSIONAL_PHOTO_MAX_BYTES } from '@shared/limits';
import type { CapturedPhotoInput } from '@shared/schemas';
import type { ProfessionalPhotoKind } from './professional-captures';
import { getDb } from '../config/db';
import { AppError } from '../utils/AppError';

export const CAPTURE_UPLOADS_COLLECTION = 'professionalcaptureuploads';
export const CAPTURE_UPLOAD_INDEXES: IndexDescription[] = [
  { key: { user: 1, inquiry: 1, kind: 1 }, unique: true },
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];
type Upload = {
  _id: ObjectId;
  user: ObjectId;
  inquiry: ObjectId;
  kind: ProfessionalPhotoKind;
  revision: string;
  bytes: Binary;
  mimeType: 'image/jpeg';
  capturedAt: string;
  expiresAt: Date;
};
export const captureUploadsCollection = () =>
  getDb().collection<Upload>(CAPTURE_UPLOADS_COLLECTION);

export async function stageProfessionalCapture(input: {
  user: ObjectId;
  inquiry: ObjectId;
  kind: ProfessionalPhotoKind;
  photo: CapturedPhotoInput;
}) {
  const bytes = Buffer.from(input.photo.data, 'base64');
  if (!bytes.length || bytes.length > PROFESSIONAL_PHOTO_MAX_BYTES)
    throw AppError.badRequest('That photograph is empty or too large. Please retake it.');
  const { user, inquiry, kind } = input;
  const filter = { user, inquiry, kind };
  const update = {
    $set: {
      ...filter,
      bytes: new Binary(bytes),
      revision: randomBytes(32).toString('hex'),
      mimeType: input.photo.mimeType,
      capturedAt: input.photo.capturedAt,
      expiresAt: new Date(Date.now() + PROFESSIONAL_CAPTURE_MAX_AGE_MINUTES * 60_000),
    },
  };
  let saved;
  try {
    saved = await captureUploadsCollection().findOneAndUpdate(filter, update, {
      upsert: true,
      returnDocument: 'after',
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    saved = await captureUploadsCollection().findOneAndUpdate(filter, update, {
      returnDocument: 'after',
    });
  }
  if (!saved) throw new Error('Could not stage the professional capture');
  return { uploadId: saved._id.toString(), revision: saved.revision };
}

export async function clearProfessionalUploads(user: ObjectId, inquiry: ObjectId) {
  await captureUploadsCollection().deleteMany({ user, inquiry });
}
