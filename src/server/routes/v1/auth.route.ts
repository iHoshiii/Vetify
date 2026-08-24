import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@shared/schemas';
import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';

import { env } from '../../config/env';
import { optionalAuth } from '../../middleware/optionalAuth';
import { validate } from '../../middleware/validate';
import { recordActivity } from '../../models/activity-event';
import {
  findRefreshTokenWithOwner,
  hashToken,
  isRefreshTokenActive,
  revokeRefreshTokenByHash,
} from '../../models/refresh-token';
import {
  comparePassword,
  findUserByEmail,
  findUserWithPasswordByEmail,
  insertUser,
  toPublicUser,
} from '../../models/users';
import {
  accessTokenClaimsFor,
  createAuthPayloadFor,
  findOrCreateOAuthUser,
  setRefreshCookie,
  signAccessToken,
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
import { fail, failReason, ok } from '../../utils/response';

const router = Router();

/**
 * Turns away a caller whose account has been suspended or banned, before any
 * token is minted. Login and the OAuth callback both come through here — a block
 * that only cut existing sessions would let the same person sign straight back
 * in.
 */
function accountBlockReason(status: string | undefined): string | null {
  if (!status || status === 'active') return null;
  return status;
}

function readRefreshCookie(req: Request): string | undefined {
  const jar = req.cookies as Record<string, string> | undefined;
  return jar?.[env.REFRESH_COOKIE_NAME] ?? jar?.refresh_token;
}

/**
 * Sends the browser back to the client with a short reason code. Provider and
 * database detail stays in the server log — the query string is user-visible and
 * has no business carrying it.
 */
function redirectWithError(res: Response, reason: string): void {
  const url = new URL(env.OAUTH_FAILURE_REDIRECT);
  url.searchParams.set('reason', reason);
  res.redirect(url.toString());
}

// POST /api/v1/auth/signup
router.post('/signup', validate(signupSchema), async (req, res) => {
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

  recordActivity({ type: 'user.signed_up', user: user._id, metadata: { provider: 'local' } });

  setRefreshCookie(res, auth.refreshToken, auth.expiresAt);
  ok(res, { accessToken: auth.accessToken, user: auth.user });
});

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const payload = req.body as LoginInput;
  // The one read in the codebase that returns the stored hash.
  const user = await findUserWithPasswordByEmail(payload.email);
  if (!user) return fail(res, 401, 'Invalid credentials');

  const match = await comparePassword(user.password, payload.password);
  if (!match) return fail(res, 401, 'Invalid credentials');

  // Checked after the password so a wrong guess cannot be used to probe which
  // addresses belong to suspended accounts.
  const blocked = accountBlockReason(user.status);
  if (blocked) {
    return failReason(res, 403, 'This account is not active.', `account-${blocked}`);
  }

  const auth = await createAuthPayloadFor(user);
  setRefreshCookie(res, auth.refreshToken, auth.expiresAt);

  recordActivity({ type: 'user.logged_in', user: user._id, metadata: { provider: 'local' } });

  ok(res, { accessToken: auth.accessToken, user: auth.user });
});

/**
 * POST /api/v1/auth/refresh
 *
 * Returns the user alongside the token because it is the only way the OAuth
 * callback page can learn who just logged in — that flow never sees a JSON login
 * response, only the refresh cookie the callback planted.
 */
router.post('/refresh', async (req, res) => {
  const raw = readRefreshCookie(req);
  if (!raw) return fail(res, 401, 'Missing refresh token');

  const tokenHash = hashToken(raw);
  const rt = await findRefreshTokenWithOwner(tokenHash);
  if (!rt || !isRefreshTokenActive(rt)) {
    return fail(res, 401, 'Invalid or expired refresh token');
  }

  if (!rt.owner) return fail(res, 401, 'Refresh token is not attached to a user');

  // Suspending or banning revokes the stored tokens, so this rarely fires. It
  // stays as the backstop for a token minted in the same moment the status
  // changed, and it clears the cookie so the client stops retrying.
  const blocked = accountBlockReason(rt.owner.status);
  if (blocked) {
    await revokeRefreshTokenByHash(tokenHash);
    res.clearCookie(env.REFRESH_COOKIE_NAME);
    return failReason(res, 403, 'This account is not active.', `account-${blocked}`);
  }

  const publicUser = toPublicUser(rt.owner);
  const accessToken = signAccessToken(accessTokenClaimsFor(publicUser));
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

  ok(res, { loggedOut: true });
});

/**
 * GET /api/v1/auth/:provider
 *
 * Starts the dance. Mints a state nonce and a PKCE verifier, seals both into a
 * signed short-lived cookie, and bounces the browser to the provider.
 */
router.get('/:provider', (req, res) => {
  const name = (req.params.provider ?? '').toLowerCase();
  if (!isOAuthProviderName(name)) {
    return fail(res, 404, `Unknown auth provider '${req.params.provider}'`);
  }

  const config = getProviderConfig(name);
  if (!config) {
    return fail(res, 501, `${name} login is not configured on this server`);
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const { verifier, challenge } = createPkcePair();

  res.cookie(OAUTH_STATE_COOKIE, sealState(name, state, verifier), stateCookieOptions);
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
  if (!config) return fail(res, 501, `${name} login is not configured on this server`);

  try {
    const profile = await fetchProfileFromCode(name, config, code, sealed.codeVerifier);
    const user = await findOrCreateOAuthUser(name, profile);

    // Same block as the password path. Without it, "Continue with Google" is a
    // way around a ban.
    if (accountBlockReason(user.status)) return redirectWithError(res, 'blocked');

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
