import { Router } from 'express';
import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@shared/schemas';
import {
  nativeExchangeSchema,
  nativeHandoffSchema,
  nativeRefreshSchema,
} from '../../../shared/native-auth';
import { env } from '../../config/env';
import { authLimiter } from '../../middleware/auth-limiter';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { recordActivity } from '../../models/activity-event';
import { consumeNativeHandoff, createNativeHandoff } from '../../models/native-handoff';
import { hashToken } from '../../models/refresh-token';
import { toPublicUser } from '../../models/users';
import { authenticateLocalAccount, createLocalAccount } from '../../services/local-auth.service';
import {
  createNativeSession,
  logoutNativeSession,
  refreshNativeSession,
  requireBrowserSession,
} from '../../services/native-session.service';
import { AppError } from '../../utils/AppError';
import { ok } from '../../utils/response';
import nativeSocialRouter from './native-social.route';

const router = Router();
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use('/oauth', nativeSocialRouter);

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const user = await authenticateLocalAccount(req.body as LoginInput);
  const session = await createNativeSession(user);
  recordActivity({ type: 'user.logged_in', user: user._id, metadata: { provider: 'local' } });
  ok(res, session);
});

router.post('/signup', authLimiter, validate(signupSchema), async (req, res) => {
  const user = await createLocalAccount(req.body as SignupInput);
  const session = await createNativeSession(user);
  recordActivity({ type: 'user.signed_up', user: user._id, metadata: { provider: 'local' } });
  ok(res, session);
});

router.post(
  '/handoff',
  authLimiter,
  optionalAuth,
  validate(nativeHandoffSchema),
  async (req, res) => {
    if (req.headers.origin && req.headers.origin !== new URL(env.CLIENT_ORIGIN).origin) {
      throw AppError.forbidden('Create this QR code from the main system.');
    }
    const raw = (req.cookies as Record<string, string> | undefined)?.[env.REFRESH_COOKIE_NAME];
    if (!raw) throw AppError.unauthorized('Sign in to the main system first.', 'login-required');
    const sourceTokenHash = hashToken(raw);
    const source = await requireBrowserSession(sourceTokenHash);
    if (req.auth && req.auth.userId !== source.user.toHexString()) {
      throw AppError.unauthorized('Your browser accounts do not match. Reload the main system.');
    }
    const handoff = await createNativeHandoff({
      ...nativeHandoffSchema.parse(req.body),
      user: source.user,
      sourceTokenHash,
    });
    ok(res, { ...handoff, user: toPublicUser(source.owner) });
  }
);

router.post('/exchange', authLimiter, validate(nativeExchangeSchema), async (req, res) => {
  const handoff = await consumeNativeHandoff(nativeExchangeSchema.parse(req.body));
  if (!handoff) throw AppError.unauthorized('This connection QR has expired or was already used.');
  const source = await requireBrowserSession(handoff.sourceTokenHash);
  if (!source.owner || !source.user.equals(handoff.user)) {
    throw AppError.unauthorized('This connection QR no longer matches its account.');
  }
  ok(res, await createNativeSession(source.owner));
});

router.post('/refresh', authLimiter, validate(nativeRefreshSchema), async (req, res) => {
  const { refreshToken } = nativeRefreshSchema.parse(req.body);
  ok(res, await refreshNativeSession(refreshToken));
});

router.post('/logout', validate(nativeRefreshSchema), async (req, res) => {
  const { refreshToken } = nativeRefreshSchema.parse(req.body);
  await logoutNativeSession(refreshToken);
  ok(res, { loggedOut: true });
});

export default router;
