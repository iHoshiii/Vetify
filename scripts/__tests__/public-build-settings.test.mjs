import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { build } from 'vite';
import { publicBuildSettings } from '../public-build-settings.mjs';

test('only explicit public settings are exposed to the browser', () => {
  const result = publicBuildSettings(
    {
      VITE_API_URL: '/api/v1',
      VITE_BOOKS_ORIGIN: 'https://books.example.test/',
      JWT_SECRET_ACCESS: 'synthetic-private-server-secret',
      VITE_PRIVATE_KEY: 'synthetic-prefixed-private-secret',
    },
    { VITE_CARTO_KEY: 'public-basemap-key', AWS_SECRET_ACCESS_KEY: 'synthetic-private-aws-secret' }
  );
  assert.deepEqual(result.envPrefix, []);
  assert.deepEqual(Object.keys(result.define).sort(), [
    'import.meta.env.VITE_ANATOMY_ORIGIN',
    'import.meta.env.VITE_API_URL',
    'import.meta.env.VITE_BLOGS_ORIGIN',
    'import.meta.env.VITE_BOOKS_ORIGIN',
    'import.meta.env.VITE_CARTO_KEY',
    'import.meta.env.VITE_REALTIME_URL',
  ]);
  assert.equal(result.define['import.meta.env.VITE_BOOKS_ORIGIN'], '"https://books.example.test"');
  assert.equal(result.define['import.meta.env.VITE_CARTO_KEY'], '"public-basemap-key"');
  assert.doesNotMatch(JSON.stringify(result), /synthetic-private|synthetic-prefixed/);
});

for (const [name, values] of [
  [
    'VITE_API_URL',
    [
      'http://api.example.test',
      'https://user:private-canary@api.example.test',
      'https://api.example.test?token=private-canary',
      'https://api.example.test#private-canary',
      'invalid',
    ],
  ],
  [
    'VITE_REALTIME_URL',
    [
      'ws://api.example.test',
      'wss://user:private-canary@api.example.test',
      'wss://api.example.test?token=private-canary',
    ],
  ],
  [
    'VITE_BOOKS_ORIGIN',
    [
      'http://books.example.test',
      'https://user:private-canary@books.example.test',
      'https://books.example.test/private-canary',
    ],
  ],
]) {
  for (const value of values) {
    test(`${name} rejects a private or invalid URL without echoing it`, () => {
      assert.throws(
        () => publicBuildSettings({ [name]: value }, {}),
        (error) => {
          assert.match(error.message, new RegExp(name));
          assert.ok(!error.message.includes(value));
          assert.doesNotMatch(error.message, /private-canary/);
          return true;
        }
      );
    });
  }
}

test('bundling import.meta.env cannot expose local files or ambient prefixed secrets', async () => {
  const cache = resolve('node_modules/.cache');
  await mkdir(cache, { recursive: true });
  const fixture = await mkdtemp(join(cache, 'public-settings-'));
  const previous = process.env.VITE_PRIVATE_BUILD_CANARY;
  process.env.VITE_PRIVATE_BUILD_CANARY = 'synthetic-ambient-secret-canary';
  try {
    await writeFile(
      join(fixture, '.env.production'),
      'VITE_LOCAL_PRIVATE_CANARY=synthetic-file-secret-canary\n'
    );
    await writeFile(
      join(fixture, 'entry.js'),
      'export const env = import.meta.env; export const api = import.meta.env.VITE_API_URL; export const key = import.meta.env.VITE_CARTO_KEY;'
    );
    const result = await build({
      configFile: false,
      root: fixture,
      envDir: fixture,
      mode: 'production',
      logLevel: 'silent',
      ...publicBuildSettings({ VITE_API_URL: '/api/v1', VITE_CARTO_KEY: 'public-basemap-key' }, {}),
      build: {
        write: false,
        minify: false,
        lib: { entry: join(fixture, 'entry.js'), formats: ['es'] },
      },
    });
    const bundles = Array.isArray(result) ? result : [result];
    const output = bundles
      .flatMap((bundle) => bundle.output)
      .map((item) => item.code ?? '')
      .join('\n');
    assert.doesNotMatch(output, /synthetic-ambient-secret-canary|synthetic-file-secret-canary/);
    assert.match(output, /\/api\/v1/);
    assert.match(output, /public-basemap-key/);
  } finally {
    if (previous === undefined) delete process.env.VITE_PRIVATE_BUILD_CANARY;
    else process.env.VITE_PRIVATE_BUILD_CANARY = previous;
    assert.equal(dirname(fixture), cache);
    await rm(fixture, { recursive: true, force: true });
  }
});
