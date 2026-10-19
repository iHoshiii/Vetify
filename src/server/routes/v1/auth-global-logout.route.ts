import { Router } from 'express';
import { env } from '../../config/env';
import { authLimiter } from '../../middleware/auth-limiter';
import { revokeAllRefreshTokensForUser } from '../../models/refresh-token';
import { restrictAccount } from '../../models/users/restrict-account';
import { mainBrowserSession } from '../../oidc/bindings';
import { disconnectUserSessions } from '../../realtime/hub';
import {
  ACCOUNT_LINK_PROOF_COOKIE,
  accountLinkCookieOptions,
} from '../../services/account-link-proof';
import {
  PASSWORD_PROOF_COOKIE,
  passwordProofCookieOptions,
} from '../../services/account-auth-proof';
import { AppError } from '../../utils/AppError';
import { ok } from '../../utils/response';

const router = Router();
router.post('/logout-all', authLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.get('origin') !== new URL(env.CLIENT_ORIGIN).origin)
    throw AppError.forbidden('Invalid sign-out origin.');
  const session = await mainBrowserSession(req);
  const user = await restrictAccount(session.owner._id, {});
  if (!user) throw AppError.unauthorized('Your account no longer exists.');
  const version = user.sessionVersion ?? 0;
  disconnectUserSessions(user._id.toHexString(), version);
  await revokeAllRefreshTokensForUser(user._id, version);
  res.clearCookie(env.REFRESH_COOKIE_NAME);
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  res.clearCookie(ACCOUNT_LINK_PROOF_COOKIE, { path: accountLinkCookieOptions.path });
  ok(res, { loggedOut: true, scope: 'all' });
});
export default router;
