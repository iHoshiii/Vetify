import { ACCOUNT_AUTH_ERRORS, type AccountAuthError } from '@shared/account-auth';
import { Router } from 'express';

import { env } from '../../config/env';
import { completeAccountAuthorization } from '../../services/account-auth-callback.service';
import {
  PASSWORD_PROOF_COOKIE,
  passwordProofCookieOptions,
} from '../../services/account-auth-proof';
import { requireAccountCallbackSession } from '../../services/account-auth-session';
import {
  ACCOUNT_LINK_PROOF_COOKIE,
  accountLinkCookieOptions,
} from '../../services/account-link-proof';
import {
  fetchProfileFromCode,
  getProviderConfig,
  isOAuthProviderName,
  OAuthError,
} from '../../services/oauth.service';
import {
  OAUTH_STATE_COOKIE,
  stateCookieOptions,
  statesMatch,
  unsealState,
} from '../../services/oauth-state';
import { AppError } from '../../utils/AppError';

const router = Router();

function settingsUrl(key: string, value: string): string {
  const url = new URL('/settings/security', env.CLIENT_ORIGIN);
  url.searchParams.set(key, value);
  return url.toString();
}

function callbackError(error: unknown): AccountAuthError {
  if (error instanceof OAuthError) return 'provider';
  if (error instanceof AppError) {
    if (
      error.reason === 'login-required' ||
      (error.reason?.startsWith('account-') && error.statusCode === 403)
    )
      return 'session-expired';
    if (error.reason === 'provider-already-linked') return 'already-linked';
    if (ACCOUNT_AUTH_ERRORS.includes(error.reason as AccountAuthError))
      return error.reason as AccountAuthError;
  }
  return 'provider';
}

router.get('/:provider/callback', async (req, res, next) => {
  const state = unsealState(req.cookies?.[OAUTH_STATE_COOKIE]);
  if (!state?.accountAuth) return next();
  const context = state.accountAuth;
  res.setHeader('Cache-Control', 'no-store');
  res.clearCookie(OAUTH_STATE_COOKIE, { path: stateCookieOptions.path });
  if (context.purpose === 'add-password') {
    res.clearCookie(PASSWORD_PROOF_COOKIE, { path: passwordProofCookieOptions.path });
  }
  const errorRedirect = (reason: AccountAuthError) =>
    res.redirect(settingsUrl('accountAuthError', reason));
  const provider = String(req.params.provider ?? '').toLowerCase();
  if (
    !isOAuthProviderName(provider) ||
    provider !== state.provider ||
    !statesMatch(state.state, req.query.state)
  ) {
    return errorRedirect('state');
  }
  if (typeof req.query.error === 'string') return errorRedirect('denied');
  if (typeof req.query.code !== 'string' || !req.query.code.trim()) return errorRedirect('code');
  const config = getProviderConfig(provider);
  if (!config) return errorRedirect('unconfigured');
  try {
    const user = await requireAccountCallbackSession(req, context);
    const profile = await fetchProfileFromCode(
      provider,
      config,
      req.query.code,
      state.codeVerifier
    );
    const proof = await completeAccountAuthorization(
      user,
      context,
      provider,
      profile,
      req.cookies?.[ACCOUNT_LINK_PROOF_COOKIE]
    );
    if (context.purpose === 'add-password') {
      res.cookie(PASSWORD_PROOF_COOKIE, proof, passwordProofCookieOptions);
      return res.redirect(settingsUrl('auth', 'password-ready'));
    }
    res.clearCookie(ACCOUNT_LINK_PROOF_COOKIE, { path: accountLinkCookieOptions.path });
    return res.redirect(settingsUrl('connection', `${provider}-linked`));
  } catch (error) {
    return errorRedirect(callbackError(error));
  }
});

export default router;
