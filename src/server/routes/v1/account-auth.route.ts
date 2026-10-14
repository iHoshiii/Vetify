import {
  addPasswordSchema,
  connectProviderSchema,
  type AddPasswordInput,
  type ConnectProviderInput,
} from '@shared/account-auth';
import { Router } from 'express';

import { env } from '../../config/env';
import { authLimiter } from '../../middleware/auth-limiter';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import {
  accountLoginMethods,
  addAccountPassword,
  beginAccountAuthorization,
} from '../../services/account-auth.service';
import {
  PASSWORD_PROOF_COOKIE,
  passwordProofCookieOptions,
} from '../../services/account-auth-proof';
import { requireAccountBrowserSession } from '../../services/account-auth-session';
import { OAUTH_STATE_COOKIE, stateCookieOptions } from '../../services/oauth-state';
import { ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';

const router = Router();
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use(optionalAuth, signedIn);

router.get('/', async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  ok(res, await accountLoginMethods(user, sourceTokenHash, req.cookies?.[PASSWORD_PROOF_COOKIE]));
});

router.post('/reauthenticate', authLimiter, async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  const action = await beginAccountAuthorization(user, sourceTokenHash, 'add-password');
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  res.cookie(OAUTH_STATE_COOKIE, action.stateCookie, stateCookieOptions);
  ok(res, { url: action.url });
});

router.post('/password', authLimiter, validate(addPasswordSchema), async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  await addAccountPassword(
    user,
    sourceTokenHash,
    req.cookies?.[PASSWORD_PROOF_COOKIE],
    (req.body as AddPasswordInput).newPassword
  );
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  res.clearCookie(env.REFRESH_COOKIE_NAME);
  ok(res, { added: true });
});

router.post('/:provider', authLimiter, validate(connectProviderSchema), async (req, res) => {
  const provider = req.params.provider;
  if (provider !== 'google' && provider !== 'facebook')
    return res.status(404).json({ error: 'Unknown provider' });
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  const { currentPassword } = req.body as ConnectProviderInput;
  const action = await beginAccountAuthorization(
    user,
    sourceTokenHash,
    'connect-provider',
    currentPassword,
    provider
  );
  res.cookie(OAUTH_STATE_COOKIE, action.stateCookie, stateCookieOptions);
  ok(res, { url: action.url });
});

export default router;
