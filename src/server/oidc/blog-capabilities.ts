import { Router } from 'express';
import type { Provider } from 'oidc-provider';
import { findProfessionalByUser } from '../models/professionals';
import { AppError } from '../utils/AppError';
import { boundAccount } from './bindings';
import { BLOG_CLIENT_ID, type OidcSettings } from './settings';

// Authority is bound to the presented Blog token, never to a caller-supplied user ID.
export function blogCapabilityRoutes(provider: Provider, settings: OidcSettings) {
  const router = Router();
  router.post('/blog-capabilities', async (req, res) => {
    const authorization = req.get('authorization');
    if (
      !settings.blogClientSecret ||
      !authorization?.startsWith('Bearer ') ||
      authorization.length > 2048
    )
      throw AppError.unauthorized('A current Blog session is required.');
    const token = await provider.AccessToken.find(authorization.slice(7));
    if (
      !token ||
      token.clientId !== BLOG_CLIENT_ID ||
      !token.exp ||
      token.exp * 1000 <= Date.now()
    ) {
      throw AppError.unauthorized('A current Blog session is required.');
    }
    const user = await boundAccount(token.grantId, token.accountId);
    if (!user) throw AppError.unauthorized('Your Vetify session is no longer active.');
    const professional = await findProfessionalByUser(user._id);
    const approval =
      professional?.status === 'interview'
        ? 'pending'
        : professional?.status === 'suspended'
        ? 'revoked'
        : professional?.status;
    res.json({
      data: {
        version: 1,
        issuer: settings.issuer,
        audience: BLOG_CLIENT_ID,
        user: {
          id: user._id.toHexString(),
          name: user.name ?? null,
          role: user.role ?? 'user',
          status: 'active',
        },
        emailVerified: true,
        ...(approval ? { professional: { status: approval } } : {}),
        tokenExpiresAt: new Date(token.exp * 1000).toISOString(),
        validUntil: new Date(Math.min(Date.now() + 30000, token.exp * 1000)).toISOString(),
      },
    });
  });
  return router;
}
