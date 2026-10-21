import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('../.tmp/', import.meta.url);
const destination = new URL('books-capability-secrets.json', directory);
const token = randomBytes(48).toString('base64url');
const configuration = {
  audience: 'vetify-books',
  scope: 'books:capabilities:read',
  main: {
    BOOKS_CAPABILITY_TOKEN_SHA256: createHash('sha256').update(token).digest('hex'),
    BOOKS_CAPABILITY_TOKEN_EXPIRES_AT: new Date(
      Date.now() + 90 * 24 * 60 * 60 * 1000
    ).toISOString(),
  },
  books: { MAIN_AUTH_SERVICE_TOKEN: token },
};
await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(destination, `${JSON.stringify(configuration, null, 2)}\n`, {
  flag: 'wx',
  mode: 0o600,
});
console.log(
  `Created Books capability credentials at ${fileURLToPath(destination)}. Values were not printed.`
);
