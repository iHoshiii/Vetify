import { Router } from 'express';
import { env } from '../../config/env';
import { optionalAuth } from '../../middleware/optionalAuth';
import { authLimiter } from '../../middleware/auth-limiter';
import { recordActivity } from '../../models/activity-event';
import {
  findRefreshTokenWithOwner,
  hashToken,
  isRefreshTokenActive,
  revokeRefreshTokenByHash,
} from '../../models/refresh-token';
import { rotateRefreshToken } from '../../models/refresh-token/rotation';
import { toPublicUser } from '../../models/users';
import {
  accessTokenClaimsFor,
  setRefreshCookie,
  signAccessToken,
} from '../../services/auth.service';
import {
  ACCOUNT_LINK_PROOF_COOKIE,
  accountLinkCookieOptions,
  rotateAccountLinkProof,
} from '../../services/account-link-proof';
import {
  PASSWORD_PROOF_COOKIE,
  passwordProofCookieOptions,
  rotatePasswordProof,
} from '../../services/account-auth-proof';
import { blockedMessage } from '../../services/user-status.service';
import { fail, failReason, ok } from '../../utils/response';
import { accountBlockReason, readRefreshCookie } from './auth-helpers';
const router = Router();
router.post('/refresh', authLimiter, async (req, res) => {
  const raw = readRefreshCookie(req);
  if (!raw) return fail(res, 401, 'Missing refresh token');

  const tokenHash = hashToken(raw);
  const rt = await findRefreshTokenWithOwner(tokenHash);
  if (!rt) return fail(res, 401, 'Invalid or expired refresh token');
  if (rt.nativeClientId) return fail(res, 401, 'Use mobile session refresh for this token');

  // Reuse detection: a token still on record but already revoked is a replay of one rotation burned, so drop every session for that owner.
  if (rt.revokedAt) {
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return fail(res, 401, 'Invalid or expired refresh token');
  }
  if (!isRefreshTokenActive(rt)) return fail(res, 401, 'Invalid or expired refresh token');
  if (!rt.owner) return fail(res, 401, 'Refresh token is not attached to a user');

  // Suspending or banning revokes the stored tokens, so this rarely fires. It
  // stays as the backstop for a token minted in the same moment the status
  // changed, and it clears the cookie so the client stops retrying.
  const blocked = await accountBlockReason(rt.owner);
  if (blocked) {
    await revokeRefreshTokenByHash(tokenHash);
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return failReason(res, 403, blockedMessage(blocked), `account-${blocked}`);
  }

  // Rotate: burn the presented token and plant a fresh one, so a cookie is good for a single use and its replay trips the reuse check above.
  const publicUser = toPublicUser(rt.owner);
  const rotated = await rotateRefreshToken(raw, rt);
  if (!rotated) {
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return fail(res, 401, 'Invalid or expired refresh token');
  }
  setRefreshCookie(res, rotated.token, rotated.expiresAt);
  const proof = rotatePasswordProof(
    req.cookies?.[PASSWORD_PROOF_COOKIE],
    publicUser.id,
    tokenHash,
    hashToken(rotated.token)
  );
  if (proof)
    res.cookie(PASSWORD_PROOF_COOKIE, proof.cookie, {
      ...passwordProofCookieOptions,
      maxAge: proof.expiresAt - Date.now(),
    });
  const emailProof = await rotateAccountLinkProof(
    req.cookies?.[ACCOUNT_LINK_PROOF_COOKIE],
    publicUser.id,
    tokenHash,
    hashToken(rotated.token)
  );
  if (emailProof)
    res.cookie(ACCOUNT_LINK_PROOF_COOKIE, emailProof.cookie, {
      ...accountLinkCookieOptions,
      maxAge: emailProof.expiresAt - Date.now(),
    });
  const accessToken = signAccessToken(
    accessTokenClaimsFor(publicUser, rt.owner.sessionVersion ?? 0)
  );
  ok(res, { accessToken, user: publicUser });
});

// POST /api/v1/auth/logout
// optionalAuth only so the event can be attributed. It never rejects, so a
// logout still works for someone whose access token expired first.
router.post('/logout', optionalAuth, async (req, res) => {
  const raw = readRefreshCookie(req);
  if (raw) {
    await revokeRefreshTokenByHash(hashToken(raw));
  }
  res.clearCookie(env.REFRESH_COOKIE_NAME);

  if (req.auth) recordActivity({ type: 'user.logged_out', user: req.auth.userId });
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  res.clearCookie(ACCOUNT_LINK_PROOF_COOKIE, { path: accountLinkCookieOptions.path });

  ok(res, { loggedOut: true });
});
export default router;
