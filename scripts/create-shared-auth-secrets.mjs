import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('../.tmp/', import.meta.url);
const destination = new URL('shared-auth-secrets.json', directory);
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwks = {
  keys: [{ ...privateKey.export({ format: 'jwk' }), kid: randomUUID(), alg: 'RS256', use: 'sig' }],
};
const configuration = {
  OIDC_ANATOMY_CLIENT_SECRET: randomBytes(48).toString('base64url'),
  OIDC_BLOG_CLIENT_SECRET: randomBytes(48).toString('base64url'),
  OIDC_COOKIE_KEYS: JSON.stringify([
    randomBytes(32).toString('base64url'),
    randomBytes(32).toString('base64url'),
  ]),
  OIDC_JWKS: JSON.stringify(jwks),
};
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(destination, `${JSON.stringify(configuration, null, 2)}\n`, {
  flag: 'wx',
  mode: 0o600,
});
console.log(
  `Created shared-auth secrets at ${fileURLToPath(destination)}. Values were not printed.`
);
