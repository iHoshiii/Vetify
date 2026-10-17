import type { RequestHandler } from 'express';
import { ObjectId } from 'mongodb';
import { PROFESSIONAL_PHOTO_KINDS } from '@shared/limits';
import { professionalUploadRefsSchema } from '@shared/professional-uploads';
import { captureUploadsCollection } from '../models/professional-capture-uploads';
import { ownedProfessionalInvite } from '../routes/v1/professional-invite-access';
import { actorOf } from '../routes/v1/caller';
import { fail } from '../utils/response';

export const hydrateProfessionalPhotos: RequestHandler = async (req, res, next) => {
  const staged = PROFESSIONAL_PHOTO_KINDS.some(
    (kind) => req.body?.[kind] && typeof req.body[kind] === 'object' && 'uploadId' in req.body[kind]
  );
  if (!staged) return next();
  const refs = professionalUploadRefsSchema.safeParse(req.body);
  if (!refs.success) {
    fail(res, 400, 'Please upload all three professional photographs again.');
    return;
  }
  const inquiry = await ownedProfessionalInvite(req);
  const uploads = await captureUploadsCollection()
    .find({
      _id: { $in: PROFESSIONAL_PHOTO_KINDS.map((kind) => new ObjectId(refs.data[kind].uploadId)) },
      user: actorOf(req)._id,
      inquiry: inquiry._id,
      expiresAt: { $gt: new Date() },
    })
    .toArray();
  const photos: Record<string, unknown> = {};
  for (const kind of PROFESSIONAL_PHOTO_KINDS) {
    const reference = refs.data[kind];
    const upload = uploads.find(
      (row) =>
        row.kind === kind &&
        row._id.toString() === reference.uploadId &&
        row.revision === reference.revision
    );
    if (!upload) {
      fail(
        res,
        400,
        'A photograph expired or was replaced. Please upload your photographs again.',
        {
          [kind]: ['Retake or submit this photograph again.'],
        }
      );
      return;
    }
    photos[kind] = {
      data: Buffer.from(upload.bytes.buffer).toString('base64'),
      mimeType: upload.mimeType,
      capturedAt: upload.capturedAt,
    };
  }
  req.body = { ...req.body, ...photos };
  next();
};
