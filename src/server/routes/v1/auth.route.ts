import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@shared/schemas';
import { Router } from 'express';
import { authLimiter } from '../../middleware/auth-limiter';
import { validate } from '../../middleware/validate';
import { recordActivity } from '../../models/activity-event';
import { createAuthPayloadFor, setRefreshCookie } from '../../services/auth.service';
import { authenticateLocalAccount, createLocalAccount } from '../../services/local-auth.service';
import { requestEmailVerification } from '../../services/email-verification.service';
import { ok } from '../../utils/response';
import emailVerificationRoute from './email-verification.route';
import browserSessionRoute from './auth-browser-session.route';
import socialRoute from './auth-social.route';
import recoveryRoute from './auth-recovery.route';
const router = Router();
router.use('/email', emailVerificationRoute);
router.post('/signup', authLimiter, validate(signupSchema), async (req, res) => {
  const user = await createLocalAccount(req.body as SignupInput);
  const auth = await createAuthPayloadFor(user);
  const emailVerification = await requestEmailVerification(user);

  recordActivity({ type: 'user.signed_up', user: user._id, metadata: { provider: 'local' } });

  setRefreshCookie(res, auth.refreshToken, auth.expiresAt);
  ok(res, { accessToken: auth.accessToken, user: auth.user, emailVerification });
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const user = await authenticateLocalAccount(req.body as LoginInput);
  const auth = await createAuthPayloadFor(user);
  setRefreshCookie(res, auth.refreshToken, auth.expiresAt);

  recordActivity({ type: 'user.logged_in', user: user._id, metadata: { provider: 'local' } });

  ok(res, { accessToken: auth.accessToken, user: auth.user });
});
router.use(browserSessionRoute);
router.use(recoveryRoute);
router.use(socialRoute);
export default router;
