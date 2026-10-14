import {
  addPasswordSchema,
  connectProviderSchema,
  type AddPasswordInput,
  type ConnectProviderInput,
  requestAccountLinkSchema,
  verifyAccountLinkSchema,
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
import {
  ACCOUNT_LINK_PROOF_COOKIE,
  accountLinkCookieOptions,
} from '../../services/account-link-proof';
import {
  requestAccountLinkCode,
  verifyAccountLinkCode,
} from '../../services/account-link-verification.service';
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
  ok(
    res,
    await accountLoginMethods(
      user,
      sourceTokenHash,
      req.cookies?.[PASSWORD_PROOF_COOKIE],
      req.cookies?.[ACCOUNT_LINK_PROOF_COOKIE]
    )
  );
});

router.post('/link/code', authLimiter, validate(requestAccountLinkSchema), async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  const delivery = await requestAccountLinkCode(user, sourceTokenHash, req.body.method);
  res.clearCookie(ACCOUNT_LINK_PROOF_COOKIE, { path: accountLinkCookieOptions.path });
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  ok(res, delivery);
});

router.post('/link/verify', authLimiter, validate(verifyAccountLinkSchema), async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  const { method, code } = req.body;
  const proof = await verifyAccountLinkCode(user, sourceTokenHash, method, code);
  res.cookie(ACCOUNT_LINK_PROOF_COOKIE, proof, accountLinkCookieOptions);
  if (method === 'local') return ok(res, { verified: true });
  const action = await beginAccountAuthorization(
    user,
    sourceTokenHash,
    'connect-provider',
    undefined,
    method,
    proof
  );
  res.cookie(OAUTH_STATE_COOKIE, action.stateCookie, stateCookieOptions);
  ok(res, { verified: true, url: action.url });
});

router.post('/reauthenticate', authLimiter, async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  const action = await beginAccountAuthorization(
    user,
    sourceTokenHash,
    'add-password',
    undefined,
    undefined,
    req.cookies?.[ACCOUNT_LINK_PROOF_COOKIE]
  );
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  res.cookie(OAUTH_STATE_COOKIE, action.stateCookie, stateCookieOptions);
  ok(res, { url: action.url });
});

router.post('/password', authLimiter, validate(addPasswordSchema), async (req, res) => {
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  await addAccountPassword(
    user,
    sourceTokenHash,
    req.cookies?.[ACCOUNT_LINK_PROOF_COOKIE],
    (req.body as AddPasswordInput).newPassword,
    req.cookies?.[PASSWORD_PROOF_COOKIE]
  );
  res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  res.clearCookie(env.REFRESH_COOKIE_NAME);
  res.clearCookie(ACCOUNT_LINK_PROOF_COOKIE, { path: accountLinkCookieOptions.path });
  ok(res, { added: true });
});

router.post('/:provider', authLimiter, validate(connectProviderSchema), async (req, res) => {
  const provider = req.params.provider;
  if (provider !== 'google' && provider !== 'facebook' && provider !== 'tiktok')
    return res.status(404).json({ error: 'Unknown provider' });
  const { user, sourceTokenHash } = await requireAccountBrowserSession(req, actorOf(req));
  const { currentPassword } = req.body as ConnectProviderInput;
  const action = await beginAccountAuthorization(
    user,
    sourceTokenHash,
    'connect-provider',
    currentPassword,
    provider,
    req.cookies?.[ACCOUNT_LINK_PROOF_COOKIE]
  );
  res.cookie(OAUTH_STATE_COOKIE, action.stateCookie, stateCookieOptions);
  ok(res, { url: action.url });
});

export default router;
