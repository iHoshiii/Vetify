import { Router } from 'express';
import { capturedPhotoSchema, type CapturedPhotoInput } from '@shared/schemas';
import { professionalPhotoKindSchema } from '@shared/professional-uploads';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { stageProfessionalCapture } from '../../models/professional-capture-uploads';
import { created, fail } from '../../utils/response';
import { actorOf, signedIn } from './caller';
import { ownedProfessionalInvite } from './professional-invite-access';

const router = Router();
router.post(
  '/invites/:token/captures/:kind',
  optionalAuth,
  signedIn,
  validate(capturedPhotoSchema),
  async (req, res) => {
    const kind = professionalPhotoKindSchema.safeParse(req.params.kind);
    if (!kind.success) return fail(res, 400, 'Choose a valid professional photograph kind.');
    const inquiry = await ownedProfessionalInvite(req);
    const reference = await stageProfessionalCapture({
      user: actorOf(req)._id,
      inquiry: inquiry._id,
      kind: kind.data,
      photo: req.body as CapturedPhotoInput,
    });
    created(res, reference);
  }
);
export default router;
