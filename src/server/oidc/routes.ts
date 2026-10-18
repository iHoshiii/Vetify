import cookieParser from 'cookie-parser';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { errors, type Provider } from 'oidc-provider';
import { env, isTest } from '../config/env';
import { LambdaRateLimitStore } from '../middleware/lambda-rate-limit-store';
import { AppError } from '../utils/AppError';
import { mainBrowserSession, oidcBindings } from './bindings';
import { createOidcProvider } from './provider';
import { ANATOMY_CLIENT_ID, OIDC_PATH, readOidcSettings } from './settings';

function interactionRoutes(provider: Provider) {
  const router = express.Router();
  router.get('/interaction/:uid', async (req, res) => {
    const details = await provider.interactionDetails(req, res);
    if (details.uid !== req.params.uid) throw AppError.badRequest('Invalid sign-in transaction.');
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
      if (details.uid !== req.params.uid || details.params.client_id !== ANATOMY_CLIENT_ID) {
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
      const accountId = session.owner._id.toHexString();
      const grant = new provider.Grant({ accountId, clientId: ANATOMY_CLIENT_ID });
      grant.addOIDCScope('openid email');
      grant.addResourceScope(new URL(String(details.params.redirect_uri)).origin, 'openid email');
      const lifetime = Math.min(
        3600,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      );
      if (lifetime <= 0) throw AppError.unauthorized('Please sign in again.');
      const grantId = await grant.save();
      await oidcBindings().insertOne({
        _id: grantId,
        userId: accountId,
        browserSessionId: session._id,
        sessionVersion: session.owner.sessionVersion ?? 0,
        expiresAt: new Date(Date.now() + lifetime * 1000),
      });
      await provider.interactionFinished(
        req,
        res,
        {
          login: { accountId, ts: Math.floor(Date.now() / 1000) },
          consent: { grantId },
        },
        { mergeWithLastSubmission: false }
      );
    }
  );
  router.use((error: unknown, _req: Request, _res: Response, next: NextFunction) => {
    if (error instanceof errors.OIDCProviderError && error.statusCode < 500) {
      next(
        AppError.badRequest('This sign-in request expired or is invalid. Start again from Anatomy.')
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
