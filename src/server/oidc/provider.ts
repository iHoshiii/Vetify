import type { Request } from 'express';
import Provider, { errors } from 'oidc-provider';
import { AppError } from '../utils/AppError';
import { boundAccount, mainBrowserSession, oidcBindings } from './bindings';
import { ANATOMY_CLIENT_ID, type OidcSettings } from './settings';
import { MongoOidcAdapter } from './storage';

export function createOidcProvider(settings: OidcSettings) {
  const provider: Provider = new Provider(settings.issuer, {
    adapter: MongoOidcAdapter,
    jwks: settings.jwks,
    clients: [
      {
        client_id: ANATOMY_CLIENT_ID,
        client_secret: settings.clientSecret,
        redirect_uris: [settings.callback],
        response_types: ['code'],
        grant_types: ['authorization_code'],
        token_endpoint_auth_method: 'client_secret_post',
        id_token_signed_response_alg: 'RS256',
      },
    ],
    clientAuthMethods: ['client_secret_post'],
    responseTypes: ['code'],
    scopes: ['openid', 'email'],
    claims: { openid: ['sub'], email: ['email', 'email_verified'] },
    pkce: { required: () => true },
    cookies: {
      keys: settings.cookieKeys,
      names: {
        session: 'vetify_oidc',
        interaction: 'vetify_oidc_interaction',
        resume: 'vetify_oidc_resume',
      },
      long: { secure: settings.secure, httpOnly: true, sameSite: 'lax' },
      short: { secure: settings.secure, httpOnly: true, sameSite: 'lax' },
    },
    ttl: {
      AccessToken: 3600,
      IdToken: 300,
      AuthorizationCode: 60,
      Interaction: 300,
      Session: 3600,
      Grant: 3600,
    },
    features: {
      devInteractions: { enabled: false },
      userinfo: { enabled: false },
      rpInitiatedLogout: { enabled: false },
      introspection: {
        enabled: true,
        allowedPolicy: async (_ctx, client, token) =>
          token.kind === 'AccessToken' &&
          token.clientId === client.clientId &&
          !!(await boundAccount(token.grantId, token.accountId)),
      },
      revocation: {
        enabled: true,
        allowedPolicy: (_ctx, client, token) =>
          token.kind === 'AccessToken' && token.clientId === client.clientId,
      },
      resourceIndicators: {
        enabled: true,
        defaultResource: () => new URL(settings.callback).origin,
        useGrantedResource: () => true,
        getResourceServerInfo: (_ctx, resource, client) => {
          if (resource !== new URL(settings.callback).origin) throw new errors.InvalidTarget();
          return {
            audience: client.clientId,
            scope: 'openid email',
            accessTokenTTL: 3600,
            accessTokenFormat: 'opaque',
          };
        },
      },
    },
    interactions: {
      url: (_ctx, interaction) => `${settings.issuer}/interaction/${interaction.uid}`,
    },
    async findAccount(ctx, sub, token) {
      let user;
      if (token) user = await boundAccount(token.grantId, sub);
      else {
        try {
          const session = await mainBrowserSession(ctx.req as Request);
          if (session.owner._id.toHexString() === sub) user = session.owner;
        } catch (error) {
          if (!(error instanceof AppError)) throw error;
        }
      }
      if (!user) {
        if (!token && ctx.oidc.session) {
          delete ctx.oidc.session.accountId;
          delete ctx.oidc.session.loginTs;
          ctx.oidc.session.authorizations = {};
        }
        return undefined;
      }
      return {
        accountId: sub,
        claims: async () => ({ sub, email: user.email, email_verified: user.emailVerified }),
      };
    },
    async loadExistingGrant(ctx) {
      const grantId =
        ctx.oidc.result?.consent?.grantId ??
        (ctx.oidc.client && ctx.oidc.session?.grantIdFor(ctx.oidc.client.clientId));
      const grant = grantId ? await provider.Grant.find(grantId) : undefined;
      if (!grant || !(await boundAccount(grant.jti, grant.accountId))) return undefined;
      try {
        const session = await mainBrowserSession(ctx.req as Request);
        const binding = await oidcBindings().findOne({ _id: grant.jti });
        return binding?.browserSessionId.equals(session._id) ? grant : undefined;
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        return undefined;
      }
    },
    async extraTokenClaims() {
      return { email_verified: true, account_active: true };
    },
    renderError(ctx, out) {
      ctx.type = 'application/json';
      ctx.body = { error: out.error, error_description: out.error_description };
    },
  });
  provider.proxy = true;
  return provider;
}
