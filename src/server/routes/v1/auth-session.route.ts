import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env, isTest } from '../../config/env';
import { optionalAuth } from '../../middleware/optionalAuth';
import { recordActivity } from '../../models/activity-event';
import {
  findRefreshTokenWithOwner,
  hashToken,
  isRefreshTokenActive,
  revokeRefreshTokenByHash,
  rotateRefreshToken,
} from '../../models/refresh-token';
import { toPublicUser } from '../../models/users';
import {
  accessTokenClaimsFor,
  setRefreshCookie,
  signAccessToken,
} from '../../services/auth.service';
import { blockedMessage } from '../../services/user-status.service';
import { fail, failReason, ok } from '../../utils/response';
import { accountBlockReason, readRefreshCookie } from './auth-helpers';

const router = Router();
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  skip: () => isTest,
});

router.post('/refresh', refreshLimiter, async (req, res) => {
  const raw = readRefreshCookie(req);
  if (!raw) return fail(res, 401, 'Missing refresh token');
  const tokenHash = hashToken(raw);
  const rt = await findRefreshTokenWithOwner(tokenHash);
  if (!rt || !isRefreshTokenActive(rt) || !rt.owner) {
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return fail(res, 401, 'Invalid or expired refresh token');
  }
  const blocked = await accountBlockReason(rt.owner);
  if (blocked) {
    await revokeRefreshTokenByHash(tokenHash);
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return failReason(res, 403, blockedMessage(blocked), `account-${blocked}`);
  }
  const rotated = await rotateRefreshToken(raw, rt);
  if (!rotated) {
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return fail(res, 401, 'Invalid or expired refresh token');
  }
  const publicUser = toPublicUser(rt.owner);
  setRefreshCookie(res, rotated.token, rotated.expiresAt);
  const accessToken = signAccessToken(
    accessTokenClaimsFor(publicUser, rt.owner.sessionVersion ?? 0)
  );
  ok(res, { accessToken, user: publicUser });
});

router.post('/logout', optionalAuth, async (req, res) => {
  const raw = readRefreshCookie(req);
  if (raw) await revokeRefreshTokenByHash(hashToken(raw));
  res.clearCookie(env.REFRESH_COOKIE_NAME);
  if (req.auth) recordActivity({ type: 'user.logged_out', user: req.auth.userId });
  ok(res, { loggedOut: true });
});

export default router;
