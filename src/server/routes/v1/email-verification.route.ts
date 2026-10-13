import { emailVerificationSchema, type EmailVerificationInput } from '@shared/email-verification';
import { Router } from 'express';

import { authLimiter } from '../../middleware/auth-limiter';
import { optionalAuth } from '../../middleware/optionalAuth';
import { requireRole } from '../../middleware/requireAuth';
import { validate } from '../../middleware/validate';
import { toPublicUser } from '../../models/users';
import {
  confirmEmailVerification,
  requestEmailVerification,
} from '../../services/email-verification.service';
import { ok } from '../../utils/response';

const router = Router();

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use(authLimiter, optionalAuth, requireRole('user', 'professional', 'admin'));

router.post('/verify', validate(emailVerificationSchema), async (req, res) => {
  const { code } = req.body as EmailVerificationInput;
  const user = await confirmEmailVerification(req.currentUser!, code);
  ok(res, { user: toPublicUser(user) });
});

router.post('/resend', async (req, res) => {
  ok(res, await requestEmailVerification(req.currentUser!));
});

export default router;
