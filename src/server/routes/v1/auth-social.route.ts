import { Router } from 'express';
import crypto from 'node:crypto';
import { env } from '../../config/env';
import { recordActivity } from '../../models/activity-event';
import { createNativeSocialGrant } from '../../models/native-social-grant';
import {
  createAuthPayloadFor,
  findOrCreateOAuthUser,
  setRefreshCookie,
} from '../../services/auth.service';
import {
  nativeSocialErrorUrl,
  readNativeSocialContext,
} from '../../services/native-social.service';
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

  const native = readNativeSocialContext(req);
  if (native) res.setHeader('Cache-Control', 'no-store');
  const config = getProviderConfig(name);
  if (!config) {
    console.warn(`[auth] ${name} login requested but not configured`);
    return native
      ? res.redirect(nativeSocialErrorUrl(native, 'unconfigured'))
      : redirectWithError(res, 'unconfigured');
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const { verifier, challenge } = createPkcePair();

  res.cookie(OAUTH_STATE_COOKIE, sealState(name, state, verifier, native), stateCookieOptions);
  res.redirect(buildAuthorizeUrl(name, config, state, challenge));
});

/**
 * GET /api/v1/auth/:provider/callback
 *
 * Where the provider returns the browser. Ends in a redirect either way — this
 * is a navigation, not an XHR, so a JSON error body would just be dumped on
 * screen. The access token deliberately never touches the URL; the client picks
 * one up from /auth/refresh using the cookie set here.
 */
router.get('/:provider/callback', async (req, res) => {
  const name = (req.params.provider ?? '').toLowerCase();
  if (!isOAuthProviderName(name)) {
    return fail(res, 404, `Unknown auth provider '${req.params.provider}'`);
  }

  // Single use, whatever happens next.
  res.clearCookie(OAUTH_STATE_COOKIE, { path: stateCookieOptions.path });

  const sealed = unsealState(
    (req.cookies as Record<string, string> | undefined)?.[OAUTH_STATE_COOKIE]
  );
  if (!sealed || sealed.provider !== name || !statesMatch(sealed.state, req.query.state)) {
    // Only a verified native context may send this browser back into the app.
    return redirectWithError(res, typeof req.query.error === 'string' ? 'denied' : 'state');
  }
  const redirectError = (reason: string) =>
    sealed.native
      ? res.redirect(nativeSocialErrorUrl(sealed.native, reason))
      : redirectWithError(res, reason);
  if (sealed.native) res.setHeader('Cache-Control', 'no-store');

  if (typeof req.query.error === 'string') return redirectError('denied');

  const code = req.query.code;
  if (typeof code !== 'string' || !code) return redirectError('code');

  const config = getProviderConfig(name);
  if (!config) {
    console.warn(`[auth] ${name} callback but not configured`);
    return redirectError('unconfigured');
  }

  try {
    const profile = await fetchProfileFromCode(name, config, code, sealed.codeVerifier);
    const user = await findOrCreateOAuthUser(name, profile);

    // Same block as the password path. Without it, "Continue with Google" is a
    // way around a ban.
    if (await accountBlockReason(user)) return redirectError('blocked');

    if (sealed.native) {
      const url = await createNativeSocialGrant(sealed.native, user._id, sealed.state);
      return res.redirect(url);
    }

    const auth = await createAuthPayloadFor(user);

    setRefreshCookie(res, auth.refreshToken, auth.expiresAt);

    recordActivity({ type: 'user.logged_in', user: user._id, metadata: { provider: name } });

    return res.redirect(env.OAUTH_SUCCESS_REDIRECT);
  } catch (err) {
    console.error(`[auth] ${name} callback failed:`, (err as Error).message);
    return redirectError(err instanceof OAuthError ? err.reason ?? 'provider' : 'server');
  }
});
export default router;
