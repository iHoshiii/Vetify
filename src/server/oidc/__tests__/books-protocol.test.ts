import { generateKeyPairSync } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { ObjectId } from 'mongodb';
import * as oidc from 'openid-client';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { mountSharedAuth } from '../routes';
import { protocolHandoff } from './protocol-navigation';

const state = vi.hoisted(() => ({ active: true, bindings: new Map<string, { userId: string }>() }));
const owner = {
  _id: new ObjectId(),
  email: 'books-protocol@example.com',
  emailVerified: true,
  sessionVersion: 0,
};
const browserSessionId = new ObjectId();
vi.mock('../storage', () => ({ MongoOidcAdapter: undefined }));
vi.mock('../bindings', () => ({
  mainBrowserSession: async () => {
    if (!state.active) throw AppError.unauthorized('Sign in to Vetify.');
    return { owner, _id: browserSessionId, expiresAt: new Date(Date.now() + 3600000) };
  },
  oidcBindings: () => ({
    insertOne: async (binding: { _id: string; userId: string }) => {
      state.bindings.set(binding._id, binding);
    },
    findOne: async (query: { _id: string }) => state.bindings.get(query._id),
  }),
  boundAccount: async (id: string, sub: string) =>
    state.active && state.bindings.get(id)?.userId === sub ? owner : undefined,
}));

let server: Server;
let origin: string;
let books: oidc.Configuration;
let anatomy: oidc.Configuration;
const previous = new Map<string, string | undefined>();
const oldServer = env.SERVER_URL;
beforeAll(async () => {
  server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  env.SERVER_URL = origin;
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const values = {
    OIDC_ISSUER: `${origin}/api/oidc`,
    OIDC_ANATOMY_CLIENT_SECRET: 'anatomy-protocol-client-secret-32-characters',
    OIDC_BOOKS_CLIENT_SECRET: 'books-protocol-client-secret-independent-32-characters',
    OIDC_COOKIE_KEYS: JSON.stringify(['synthetic-protocol-cookie-key-32-characters']),
    OIDC_JWKS: JSON.stringify({
      keys: [
        { ...privateKey.export({ format: 'jwk' }), kid: 'protocol', alg: 'RS256', use: 'sig' },
      ],
    }),
  };
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  const app = express();
  app.set('trust proxy', 1);
  mountSharedAuth(app);
  server.on('request', app);
  books = await oidc.discovery(
    new URL(values.OIDC_ISSUER),
    'vetify-books',
    { client_secret: values.OIDC_BOOKS_CLIENT_SECRET },
    oidc.ClientSecretPost(values.OIDC_BOOKS_CLIENT_SECRET),
    { execute: [oidc.allowInsecureRequests] }
  );
  anatomy = await oidc.discovery(
    new URL(values.OIDC_ISSUER),
    'vetify-anatomy',
    { client_secret: values.OIDC_ANATOMY_CLIENT_SECRET },
    oidc.ClientSecretPost(values.OIDC_ANATOMY_CLIENT_SECRET),
    { execute: [oidc.allowInsecureRequests] }
  );
  oidc.enableNonRepudiationChecks(books);
  oidc.enableNonRepudiationChecks(anatomy);
});
beforeEach(() => {
  state.active = true;
});
afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server?.close((error) => (error ? reject(error) : resolve()))
  );
  env.SERVER_URL = oldServer;
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function handoff(client = books, port = 5175, overrides: Record<string, string> = {}) {
  return protocolHandoff(origin, client, port, overrides);
}

it('automatically reuses main login for Books with real PKCE and signed ID tokens', async () => {
  const result = await handoff();
  expect(result.callback?.origin).toBe('http://localhost:5175');
  expect(result.callback?.searchParams.get('error')).toBeNull();
  const tokens = await oidc.authorizationCodeGrant(books, result.callback!, {
    pkceCodeVerifier: result.verifier,
    expectedState: result.state,
    expectedNonce: result.nonce,
    idTokenExpected: true,
  });
  expect(tokens.claims()).toMatchObject({ aud: 'vetify-books', sub: owner._id.toHexString() });
  expect(await oidc.tokenIntrospection(books, tokens.access_token)).toMatchObject({
    active: true,
    aud: 'vetify-books',
  });
  expect(await oidc.tokenIntrospection(anatomy, tokens.access_token)).toMatchObject({
    active: false,
  });
  state.active = false;
  expect(await oidc.tokenIntrospection(books, tokens.access_token)).toMatchObject({
    active: false,
  });
});

it('keeps signed-out visitors signed out and sends them to the main login continuation', async () => {
  state.active = false;
  const result = await handoff();
  expect(result.callback?.pathname).toBe('/auth/shared');
  expect(result.callback?.searchParams.has('code')).toBe(false);
});

it('preserves the existing automatic Anatomy sign-in', async () => {
  const result = await handoff(anatomy, 5176);
  const tokens = await oidc.authorizationCodeGrant(anatomy, result.callback!, {
    pkceCodeVerifier: result.verifier,
    expectedState: result.state,
    expectedNonce: result.nonce,
    idTokenExpected: true,
  });
  expect(tokens.claims()?.aud).toBe('vetify-anatomy');
});

it('rejects the wrong callback and another app resource', async () => {
  const callback = await handoff(books, 5176);
  expect(callback.response.status).toBe(400);
  const resource = await handoff(books, 5175, { resource: 'http://localhost:5176' });
  expect(resource.callback?.searchParams.get('error')).toBe('invalid_target');
});
