import { forgotPasswordSchema, resetPasswordSchema } from '@shared/password-recovery';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env, isTest } from '../../config/env';
import { validate } from '../../middleware/validate';
import {
  RECOVERY_MESSAGE,
  requestPasswordRecovery,
  resetPassword,
} from '../../services/password-recovery.service';
import { fail, ok } from '../../utils/response';

const router = Router();
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  skip: () => isTest,
});

router.post(
  '/forgot-password',
  recoveryLimiter,
  validate(forgotPasswordSchema),
  async (req, res) => {
    await requestPasswordRecovery(req.body.email as string);
    ok(res, { message: RECOVERY_MESSAGE });
  }
);

router.post('/reset-password', recoveryLimiter, validate(resetPasswordSchema), async (req, res) => {
  const success = await resetPassword(req.body.token as string, req.body.password as string);
  if (!success)
    return fail(
      res,
      400,
      'This recovery link has expired or already been used. Please request a new one.'
    );
  res.clearCookie(env.REFRESH_COOKIE_NAME);
  ok(res, { message: 'Your password has been changed. Please sign in with your new password.' });
});

export default router;
