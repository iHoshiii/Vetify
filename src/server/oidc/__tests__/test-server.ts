import { generateKeyPairSync } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as oidc from 'openid-client';
import { createApp } from '../../app';
import { env } from '../../config/env';
import { startTestDb, stopTestDb } from '../../test-utils/db';
import { ANATOMY_CLIENT_ID, BOOKS_CLIENT_ID } from '../settings';

export let origin: string;
export let config: oidc.Configuration;
export let booksConfig: oidc.Configuration;
let server: Server;
export const secret = 'synthetic-anatomy-client-secret-at-least-32-characters';
export const booksSecret = 'synthetic-books-client-secret-independent-from-anatomy';
const oldServerUrl = env.SERVER_URL;
const previous = new Map<string, string | undefined>();

export async function startOidc() {
  await startTestDb();
  server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  env.SERVER_URL = origin;
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const values = {
    OIDC_ISSUER: `${origin}/api/oidc`,
    OIDC_ANATOMY_CLIENT_SECRET: secret,
    OIDC_BOOKS_CLIENT_SECRET: booksSecret,
    OIDC_COOKIE_KEYS: JSON.stringify(['synthetic-independent-cookie-key-at-least-32-characters']),
    OIDC_JWKS: JSON.stringify({
      keys: [
        { ...privateKey.export({ format: 'jwk' }), kid: 'test-rsa', alg: 'RS256', use: 'sig' },
      ],
    }),
  };
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  server.on('request', createApp());
  config = await oidc.discovery(
    new URL(values.OIDC_ISSUER),
    ANATOMY_CLIENT_ID,
    { client_secret: secret },
    oidc.ClientSecretPost(secret),
    { execute: [oidc.allowInsecureRequests] }
  );
  oidc.enableNonRepudiationChecks(config);
  booksConfig = await oidc.discovery(
    new URL(values.OIDC_ISSUER),
    BOOKS_CLIENT_ID,
    { client_secret: booksSecret },
    oidc.ClientSecretPost(booksSecret),
    { execute: [oidc.allowInsecureRequests] }
  );
  oidc.enableNonRepudiationChecks(booksConfig);
}

export async function stopOidc() {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  env.SERVER_URL = oldServerUrl;
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await stopTestDb();
}
