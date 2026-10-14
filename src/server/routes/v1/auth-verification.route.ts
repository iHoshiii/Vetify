import { emailVerificationConfirmSchema } from '@shared/email-verification';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { isTest } from '../../config/env';
import { requireAuth } from '../../middleware/requireAuth';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import {
  confirmEmailVerification,
  EMAIL_VERIFICATION_MESSAGE,
  requestEmailVerification,
} from '../../services/email-verification.service';
import { fail, ok } from '../../utils/response';

const router = Router();
const verificationLimiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
    skip: () => isTest,
  });

router.post(
  '/email-verification/request',
  verificationLimiter(5),
  optionalAuth,
  requireAuth,
  async (req, res) => {
    await requestEmailVerification(req.currentUser!._id);
    ok(res, { message: EMAIL_VERIFICATION_MESSAGE });
  }
);

router.post(
  '/email-verification/confirm',
  verificationLimiter(10),
  validate(emailVerificationConfirmSchema),
  async (req, res) => {
    const verified = await confirmEmailVerification(req.body.token as string);
    if (!verified) {
      return fail(
        res,
        400,
        'This verification link has expired or already been used. Please request a new one.'
      );
    }
    ok(res, { message: 'Your email has been verified.', verified: true });
  }
);

export default router;
