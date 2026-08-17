import crypto from 'node:crypto';

import { env } from '../config/env';

export const OAUTH_PROVIDERS = ['google', 'facebook', 'tiktok'] as const;
export type OAuthProviderName = (typeof OAUTH_PROVIDERS)[number];

export function isOAuthProviderName(value: string): value is OAuthProviderName {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

/** Provider-agnostic identity, normalised out of each provider's own payload. */
export type OAuthProfile = {
  providerId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
};

type ProviderConfig = {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** TikTok names the public identifier `client_key` in every request. */
  clientIdParam: 'client_id' | 'client_key';
  /** Params only this provider wants on the authorize request. */
  authorizeExtras?: Record<string, string>;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
};

/** Thrown for anything the provider hands back that we cannot act on. */
export class OAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthError';
  }
}

/** Every provider redirect URI is derived, so it cannot drift from SERVER_URL. */
export function redirectUriFor(provider: OAuthProviderName): string {
  return `${env.SERVER_URL}/api/v1/auth/${provider}/callback`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body ? JSON.stringify(body).slice(0, 200) : res.statusText;
    throw new OAuthError(`${new URL(url).host} returned ${res.status}: ${detail}`);
  }
  return body as T;
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const data = await fetchJson<{
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  }>('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return {
    providerId: data.sub,
    email: data.email?.toLowerCase() ?? null,
    name: data.name ?? null,
    avatarUrl: data.picture ?? null,
    emailVerified: data.email_verified === true,
  };
}

async function fetchFacebookProfile(accessToken: string): Promise<OAuthProfile> {
  const url = new URL('https://graph.facebook.com/v21.0/me');
  url.searchParams.set('fields', 'id,name,email,picture.type(large)');
  url.searchParams.set('access_token', accessToken);

  const data = await fetchJson<{
    id: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  }>(url.toString());

  return {
    providerId: data.id,
    // Absent when the user declined the email permission, or when the account
    // was registered with a phone number and has no address at all.
    email: data.email?.toLowerCase() ?? null,
    name: data.name ?? null,
    avatarUrl: data.picture?.data?.url ?? null,
    emailVerified: Boolean(data.email),
  };
}

async function fetchTikTokProfile(accessToken: string): Promise<OAuthProfile> {
  const url = new URL('https://open.tiktokapis.com/v2/user/info/');
  url.searchParams.set('fields', 'open_id,display_name,avatar_url');

  const data = await fetchJson<{
    data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } };
  }>(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });

  const user = data.data?.user;
  if (!user?.open_id) throw new OAuthError('TikTok returned no open_id');

  return {
    providerId: user.open_id,
    // TikTok publishes no email scope, so this is structurally always null.
    email: null,
    name: user.display_name ?? null,
    avatarUrl: user.avatar_url ?? null,
    emailVerified: false,
  };
}

/**
 * Returns null when the provider has no credentials configured, which the route
 * layer turns into a 501 rather than a crash. That way a half-configured .env
 * disables one button instead of breaking every login.
 */
export function getProviderConfig(provider: OAuthProviderName): ProviderConfig | null {
  switch (provider) {
    case 'google': {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
      return {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scope: 'openid email profile',
        clientIdParam: 'client_id',
        // select_account stops Google from silently reusing the one session the
        // browser already has, which is bewildering on a shared machine.
        authorizeExtras: { prompt: 'select_account' },
        fetchProfile: fetchGoogleProfile,
      };
    }
    case 'facebook': {
      if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) return null;
      return {
        clientId: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
        scope: 'email,public_profile',
        clientIdParam: 'client_id',
        fetchProfile: fetchFacebookProfile,
      };
    }
    case 'tiktok': {
      if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) return null;
      return {
        clientId: env.TIKTOK_CLIENT_KEY,
        clientSecret: env.TIKTOK_CLIENT_SECRET,
        authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        scope: 'user.info.basic',
        clientIdParam: 'client_key',
        fetchProfile: fetchTikTokProfile,
      };
    }
  }
}

/** PKCE pair. The verifier stays in our cookie; only its hash goes to the provider. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthorizeUrl(
  provider: OAuthProviderName,
  config: ProviderConfig,
  state: string,
  codeChallenge: string
): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set(config.clientIdParam, config.clientId);
  url.searchParams.set('redirect_uri', redirectUriFor(provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  for (const [key, value] of Object.entries(config.authorizeExtras ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Trades the one-time code for an access token. The redirect_uri here is not a
 * redirect — providers re-check it against the authorize call, so it has to be
 * byte-identical, which is why both sides go through redirectUriFor.
 */
export async function exchangeCodeForToken(
  provider: OAuthProviderName,
  config: ProviderConfig,
  code: string,
  codeVerifier: string
): Promise<string> {
  const body = new URLSearchParams({
    [config.clientIdParam]: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUriFor(provider),
    code_verifier: codeVerifier,
  });

  const data = await fetchJson<{
    access_token?: string;
    error?: string | { message?: string };
    error_description?: string;
  }>(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!data.access_token) {
    const reason =
      data.error_description ??
      (typeof data.error === 'string' ? data.error : data.error?.message) ??
      'provider returned no access token';
    throw new OAuthError(`Token exchange failed: ${reason}`);
  }

  return data.access_token;
}

/** One call for the whole back half of the dance: code in, normalised profile out. */
export async function fetchProfileFromCode(
  provider: OAuthProviderName,
  config: ProviderConfig,
  code: string,
  codeVerifier: string
): Promise<OAuthProfile> {
  const accessToken = await exchangeCodeForToken(provider, config, code, codeVerifier);
  return config.fetchProfile(accessToken);
}

export type { ProviderConfig };
