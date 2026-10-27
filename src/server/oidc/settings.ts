import { createPrivateKey, type JsonWebKey } from 'node:crypto';
import type { Configuration } from 'oidc-provider';
import { z } from 'zod';
import { env } from '../config/env';

export const OIDC_PATH = '/api/oidc';
export const ANATOMY_CLIENT_ID = 'vetify-anatomy';
export const BOOKS_CLIENT_ID = 'vetify-books';
export const BLOG_CLIENT_ID = 'vetify-blog';
const schema = z.object({
  OIDC_ISSUER: z.string().url(),
  OIDC_ANATOMY_CLIENT_SECRET: z.string().min(32),
  OIDC_BOOKS_CLIENT_SECRET: z.union([z.string().min(32), z.literal('')]).optional(),
  OIDC_BLOG_CLIENT_SECRET: z.union([z.string().min(32), z.literal('')]).optional(),
  OIDC_COOKIE_KEYS: z
    .string()
    .transform((value) => z.array(z.string().min(32)).min(1).parse(JSON.parse(value))),
  OIDC_JWKS: z
    .string()
    .transform((value) => JSON.parse(value) as NonNullable<Configuration['jwks']>),
});

export function readOidcSettings(source: NodeJS.ProcessEnv = process.env) {
  const names = Object.keys(schema.shape);
  if (!names.some((name) => source[name]?.trim())) return undefined;
  // Do not include secret values in configuration errors or startup logs.
  let parsed: z.infer<typeof schema>;
  try {
    parsed = schema.parse(source);
    const secrets = [
      parsed.OIDC_ANATOMY_CLIENT_SECRET,
      parsed.OIDC_BOOKS_CLIENT_SECRET,
      parsed.OIDC_BLOG_CLIENT_SECRET,
    ].filter(Boolean);
    if (new Set(secrets).size !== secrets.length) throw new Error();
    if (!parsed.OIDC_JWKS.keys?.length) throw new Error();
    for (const key of parsed.OIDC_JWKS.keys) {
      if (key.kty !== 'RSA' || !key.kid || key.alg !== 'RS256' || key.use !== 'sig')
        throw new Error();
      const privateKey = createPrivateKey({ key: key as JsonWebKey, format: 'jwk' });
      if ((privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error();
    }
  } catch {
    throw new Error(
      'Invalid OIDC configuration. Set issuer, client secret, cookie keys and private RSA JWKS.'
    );
  }
  const issuer = new URL(parsed.OIDC_ISSUER);
  if (
    issuer.href !== `${new URL(env.SERVER_URL).origin}${OIDC_PATH}` ||
    issuer.username ||
    issuer.password
  ) {
    throw new Error(`OIDC_ISSUER must equal SERVER_URL origin followed by ${OIDC_PATH}.`);
  }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(issuer.hostname);
  if (issuer.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && loopback)) {
    throw new Error('OIDC_ISSUER requires HTTPS outside local development.');
  }
  return {
    issuer: parsed.OIDC_ISSUER,
    clientSecret: parsed.OIDC_ANATOMY_CLIENT_SECRET,
    booksClientSecret: parsed.OIDC_BOOKS_CLIENT_SECRET || undefined,
    blogClientSecret: parsed.OIDC_BLOG_CLIENT_SECRET || undefined,
    blogCallback: loopback
      ? 'http://localhost:5178/auth/callback'
      : 'https://blogs.vetify.page/auth/callback',
    booksCallback: loopback
      ? 'http://localhost:5175/auth/callback'
      : 'https://books.vetify.page/auth/callback',
    cookieKeys: parsed.OIDC_COOKIE_KEYS,
    jwks: parsed.OIDC_JWKS,
    callback: loopback
      ? 'http://localhost:5176/auth/callback'
      : 'https://anatomy.vetify.page/auth/callback',
    secure: issuer.protocol === 'https:',
  };
}

export type OidcSettings = NonNullable<ReturnType<typeof readOidcSettings>>;
