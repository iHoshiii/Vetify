import type { Request, Response } from 'express';
import type { Provider } from 'oidc-provider';
import { mainBrowserSession, oidcBindings } from './bindings';
import { isSharedAuthClient } from './clients';
import { AppError } from '../utils/AppError';

export async function completeSharedSignIn(
  provider: Provider,
  req: Request,
  res: Response,
  details: Awaited<ReturnType<Provider['interactionDetails']>>,
  session: Awaited<ReturnType<typeof mainBrowserSession>>
) {
  if (!isSharedAuthClient(details.params.client_id)) throw AppError.badRequest('Invalid client.');
  const accountId = session.owner._id.toHexString();
  const lifetime = Math.min(3600, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
  if (lifetime <= 0) throw AppError.unauthorized('Please sign in again.');
  const grant = new provider.Grant({ accountId, clientId: String(details.params.client_id) });
  grant.addOIDCScope('openid email');
  grant.addResourceScope(new URL(String(details.params.redirect_uri)).origin, 'openid email');
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
    { login: { accountId, ts: Math.floor(Date.now() / 1000) }, consent: { grantId } },
    { mergeWithLastSubmission: false }
  );
}
