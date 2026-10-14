import { Router } from 'express';
import crypto from 'node:crypto';
import { env } from '../../config/env';
import { recordActivity } from '../../models/activity-event';
import {
  createAuthPayloadFor,
  findOrCreateOAuthUser,
  setRefreshCookie,
} from '../../services/auth.service';
import {
  OAUTH_STATE_COOKIE,
  sealState,
  stateCookieOptions,
  statesMatch,
  unsealState,
} from '../../services/oauth-state';
import {
  OAuthError,
  buildAuthorizeUrl,
  createPkcePair,
  fetchProfileFromCode,
  getProviderConfig,
  isOAuthProviderName,
} from '../../services/oauth.service';
import { fail } from '../../utils/response';
import { accountBlockReason, redirectWithError } from './auth-helpers';
const router = Router();

router.get('/:provider', (req, res) => {
  const name = (req.params.provider ?? '').toLowerCase();
  if (!isOAuthProviderName(name)) {
    return fail(res, 404, `Unknown auth provider '${req.params.provider}'`);
  }

  const config = getProviderConfig(name);
  if (!config) {
    console.warn(`[auth] ${name} login requested but not configured`);
    return redirectWithError(res, 'unconfigured');
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const { verifier, challenge } = createPkcePair();

  res.cookie(OAUTH_STATE_COOKIE, sealState(name, state, verifier), stateCookieOptions);
  res.redirect(buildAuthorizeUrl(name, config, state, challenge));
});

router.get('/:provider/callback', async (req, res) => {
  const name = (req.params.provider ?? '').toLowerCase();
  if (!isOAuthProviderName(name)) {
    return fail(res, 404, `Unknown auth provider '${req.params.provider}'`);
  }

  // Single use, whatever happens next.
  res.clearCookie(OAUTH_STATE_COOKIE, { path: stateCookieOptions.path });

  // Set when the user hits "cancel" on the consent screen.
  if (typeof req.query.error === 'string') {
    console.warn(`[auth] ${name} consent declined: ${req.query.error}`);
    return redirectWithError(res, 'denied');
  }

  const sealed = unsealState(
    (req.cookies as Record<string, string> | undefined)?.[OAUTH_STATE_COOKIE]
  );
  if (!sealed || sealed.provider !== name || !statesMatch(sealed.state, req.query.state)) {
    return redirectWithError(res, 'state');
  }

  const code = req.query.code;
  if (typeof code !== 'string' || !code) return redirectWithError(res, 'code');

  const config = getProviderConfig(name);
  if (!config) {
    console.warn(`[auth] ${name} callback but not configured`);
    return redirectWithError(res, 'unconfigured');
  }

  try {
    const profile = await fetchProfileFromCode(name, config, code, sealed.codeVerifier);
    const user = await findOrCreateOAuthUser(name, profile);

    // Same block as the password path. Without it, "Continue with Google" is a
    // way around a ban.
    if (await accountBlockReason(user)) return redirectWithError(res, 'blocked');

    const auth = await createAuthPayloadFor(user);

    setRefreshCookie(res, auth.refreshToken, auth.expiresAt);

    recordActivity({ type: 'user.logged_in', user: user._id, metadata: { provider: name } });

    return res.redirect(env.OAUTH_SUCCESS_REDIRECT);
  } catch (err) {
    console.error(`[auth] ${name} callback failed:`, (err as Error).message);
    return redirectWithError(res, err instanceof OAuthError ? 'provider' : 'server');
  }
});

export default router;
