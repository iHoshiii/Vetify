import cookieParser from 'cookie-parser';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { errors, type Provider } from 'oidc-provider';
import { env, isTest } from '../config/env';
import { LambdaRateLimitStore } from '../middleware/lambda-rate-limit-store';
import { AppError } from '../utils/AppError';
import { mainBrowserSession } from './bindings';
import { completeSharedSignIn } from './complete';
import { isSharedAuthClient } from './clients';
import { createOidcProvider } from './provider';
import { OIDC_PATH, readOidcSettings } from './settings';

function interactionRoutes(provider: Provider) {
  const router = express.Router();
  router.get('/interaction/:uid', async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    if (details.uid !== req.params.uid) throw AppError.badRequest('Invalid sign-in transaction.');
    const explicitPrompt = /\b(login|consent|select_account)\b/.test(
      String(details.params.prompt ?? '')
    );
    if (isSharedAuthClient(details.params.client_id) && !explicitPrompt) {
      let session;
      try {
        session = await mainBrowserSession(req);
      } catch (error) {
        if (!(error instanceof AppError && [401, 403].includes(error.statusCode))) throw error;
      }
      if (session) {
        await completeSharedSignIn(provider, req, res, details, session);
        return;
      }
    }
    const destination = new URL('/auth/shared', env.CLIENT_ORIGIN);
    destination.searchParams.set('interaction', details.uid);
    res.redirect(destination.href);
  });
  router.post(
    '/interaction/:uid/complete',
    express.urlencoded({ extended: false, limit: '2kb' }),
    async (req, res) => {
      if (req.get('origin') !== new URL(env.CLIENT_ORIGIN).origin)
        throw AppError.forbidden('Invalid sign-in origin.');
      const details = await provider.interactionDetails(req, res);
      if (details.uid !== req.params.uid || !isSharedAuthClient(details.params.client_id)) {
        throw AppError.badRequest('Invalid sign-in transaction.');
      }
      if (req.body.decision === 'deny') {
        await provider.interactionFinished(req, res, {
          error: 'access_denied',
          error_description: 'Sign-in cancelled.',
        });
        return;
      }
      if (req.body.decision !== 'allow') throw AppError.badRequest('Choose whether to continue.');
      const session = await mainBrowserSession(req);
      await completeSharedSignIn(provider, req, res, details, session);
    }
  );
  router.use((error: unknown, _req: Request, _res: Response, next: NextFunction) => {
    if (error instanceof errors.OIDCProviderError && error.statusCode < 500) {
      next(
        AppError.badRequest(
          'This sign-in request expired or is invalid. Return to the app and try again.'
        )
      );
    } else next(error);
  });
  return router;
}

export function mountSharedAuth(app: Express) {
  const settings = readOidcSettings();
  if (!settings) return;
  const provider = createOidcProvider(settings);
  const limiter = rateLimit({
    store: new LambdaRateLimitStore('oidc'),
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
  });
  app.use(OIDC_PATH, (req, res, next) => {
    const issuer = new URL(settings.issuer);
    req.headers['x-forwarded-host'] = issuer.host;
    req.headers['x-forwarded-proto'] = issuer.protocol.slice(0, -1);
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(OIDC_PATH, limiter, cookieParser(), interactionRoutes(provider), provider.callback());
}
