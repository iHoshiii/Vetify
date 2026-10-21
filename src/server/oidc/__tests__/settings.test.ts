import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { env } from '../../config/env';
import { readOidcSettings } from '../settings';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwks = {
  keys: [
    { ...privateKey.export({ format: 'jwk' }), kid: 'settings-test', alg: 'RS256', use: 'sig' },
  ],
};
const values: NodeJS.ProcessEnv = {
  OIDC_ISSUER: `${new URL(env.SERVER_URL).origin}/api/oidc`,
  OIDC_ANATOMY_CLIENT_SECRET: 'synthetic-private-client-secret-at-least-32-characters',
  OIDC_COOKIE_KEYS: JSON.stringify(['synthetic-private-cookie-key-at-least-32-characters']),
  OIDC_JWKS: JSON.stringify(jwks),
};

describe('OIDC deployment configuration', () => {
  it('keeps the provider disabled until explicitly configured', () => {
    expect(readOidcSettings({})).toBeUndefined();
    expect(readOidcSettings({ OIDC_ISSUER: '' })).toBeUndefined();
  });

  it('rejects partial configuration without printing any secret values', () => {
    const privateValue = 'synthetic-secret-must-never-appear-in-errors';
    expect(() => readOidcSettings({ OIDC_ANATOMY_CLIENT_SECRET: privateValue })).toThrow(
      'Invalid OIDC configuration'
    );
    try {
      readOidcSettings({ OIDC_ANATOMY_CLIENT_SECRET: privateValue });
    } catch (error) {
      expect(String(error)).not.toContain(privateValue);
    }
  });

  it('registers exactly the local callback for local development', () => {
    const settings = readOidcSettings(values);
    expect(settings?.callback).toBe('http://localhost:5176/auth/callback');
    expect(settings?.secure).toBe(false);
    expect(settings?.booksCallback).toBe('http://localhost:5175/auth/callback');
    expect(settings?.booksClientSecret).toBeUndefined();
  });

  it('enables Books only with its own independent client secret', () => {
    const booksSecret = 'synthetic-books-oidc-secret-independent-32-characters';
    expect(
      readOidcSettings({ ...values, OIDC_BOOKS_CLIENT_SECRET: booksSecret })?.booksClientSecret
    ).toBe(booksSecret);
    expect(
      readOidcSettings({ ...values, OIDC_BOOKS_CLIENT_SECRET: '' })?.booksClientSecret
    ).toBeUndefined();
    expect(() =>
      readOidcSettings({ ...values, OIDC_BOOKS_CLIENT_SECRET: values.OIDC_ANATOMY_CLIENT_SECRET })
    ).toThrow('Invalid OIDC configuration');
  });

  it('registers exactly the production callback with an independent secret', () => {
    const old = env.SERVER_URL;
    env.SERVER_URL = 'https://vetify.page';
    try {
      const settings = readOidcSettings({ ...values, OIDC_ISSUER: 'https://vetify.page/api/oidc' });
      expect(settings?.callback).toBe('https://anatomy.vetify.page/auth/callback');
      expect(settings?.booksCallback).toBe('https://books.vetify.page/auth/callback');
      expect(settings?.secure).toBe(true);
      expect(settings?.clientSecret).not.toBe(env.JWT_SECRET_ACCESS);
    } finally {
      env.SERVER_URL = old;
    }
  });

  it('rejects foreign issuers and malformed signing material', () => {
    expect(() =>
      readOidcSettings({ ...values, OIDC_ISSUER: 'https://attacker.example/api/oidc' })
    ).toThrow('OIDC_ISSUER must equal');
    for (const invalid of [
      '{}',
      '{"keys":[]}',
      JSON.stringify({ keys: [{ kty: 'oct', k: 'synthetic-key' }] }),
    ]) {
      expect(() => readOidcSettings({ ...values, OIDC_JWKS: invalid })).toThrow(
        'Invalid OIDC configuration'
      );
    }
  });

  it('refuses nonlocal HTTP even when SERVER_URL matches', () => {
    const old = env.SERVER_URL;
    env.SERVER_URL = 'http://vetify.page';
    try {
      expect(() =>
        readOidcSettings({ ...values, OIDC_ISSUER: 'http://vetify.page/api/oidc' })
      ).toThrow('requires HTTPS');
    } finally {
      env.SERVER_URL = old;
    }
  });
});
