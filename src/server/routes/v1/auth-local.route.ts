import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@shared/schemas';
import { Router } from 'express';
import { authLimiter } from '../../middleware/auth-limiter';
import { validate } from '../../middleware/validate';
import { recordActivity } from '../../models/activity-event';
import {
  comparePassword,
  findUserByEmail,
  findUserWithPasswordByEmail,
  insertUser,
} from '../../models/users';
import { createAuthPayloadFor, setRefreshCookie } from '../../services/auth.service';
import { blockedMessage } from '../../services/user-status.service';
import { sendSignupVerification } from '../../services/email-verification.service';
import { fail, failReason, ok } from '../../utils/response';
import { accountBlockReason } from './auth-helpers';
const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', authLimiter, validate(signupSchema), async (req, res) => {
  const payload = req.body as SignupInput;

  const existing = await findUserByEmail(payload.email);
  if (existing) return fail(res, 409, 'User with that email already exists');

  const user = await insertUser({
    email: payload.email,
    password: payload.password,
    name: payload.name,
    provider: 'local',
  });
  const auth = await createAuthPayloadFor(user);

  await sendSignupVerification(user);

  recordActivity({ type: 'user.signed_up', user: user._id, metadata: { provider: 'local' } });

  setRefreshCookie(res, auth.refreshToken, auth.expiresAt);
  ok(res, { accessToken: auth.accessToken, user: auth.user });
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const payload = req.body as LoginInput;
  // The one read in the codebase that returns the stored hash.
  const user = await findUserWithPasswordByEmail(payload.email);
  if (!user) return fail(res, 401, 'Invalid credentials');

  const match = await comparePassword(user.password, payload.password);
  if (!match) return fail(res, 401, 'Invalid credentials');

  // Checked after the password so a wrong guess cannot be used to probe which
  // addresses belong to suspended accounts.
  const blocked = await accountBlockReason(user);
  if (blocked) {
    return failReason(res, 403, blockedMessage(blocked), `account-${blocked}`);
  }

  const auth = await createAuthPayloadFor(user);
  setRefreshCookie(res, auth.refreshToken, auth.expiresAt);

  recordActivity({ type: 'user.logged_in', user: user._id, metadata: { provider: 'local' } });

  ok(res, { accessToken: auth.accessToken, user: auth.user });
});

export default router;
