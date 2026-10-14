import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = join(root, 'node_modules/.cache');
const source = new URL('../../src/server/config/env.ts', import.meta.url).href;
const command = `import {env} from ${JSON.stringify(
  source
)}; console.log(JSON.stringify({google:env.GOOGLE_CLIENT_ID ?? null,mode:env.NODE_ENV}));`;
const base = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(path|systemroot|windir|temp|tmp|comspec|userprofile|home|homedrive|homepath)$/i.test(key)
  )
);
async function fixture(action) {
  await mkdir(cache, { recursive: true });
  const cwd = await mkdtemp(join(cache, 'env-loading-'));
  await writeFile(
    join(cwd, '.env'),
    'GOOGLE_CLIENT_ID=local-only-id\nGOOGLE_CLIENT_SECRET=local-only-secret\nJWT_SECRET_ACCESS=local-synthetic-signing-secret-at-least-32-characters\nGEMINI_API_KEY=local-synthetic-api-key\n'
  );
  try {
    await action(cwd);
  } finally {
    assert.equal(dirname(cwd), cache);
    await rm(cwd, { recursive: true, force: true });
  }
}
for (const mode of ['production', 'test']) {
  test(`${mode} does not import optional credentials from local .env`, async () => {
    await fixture(async (cwd) => {
      const output = execFileSync(process.execPath, ['--input-type=module', '-e', command], {
        cwd,
        encoding: 'utf8',
        env: {
          ...base,
          NODE_ENV: mode,
          JWT_SECRET_ACCESS: 'synthetic-signing-secret-at-least-32-characters',
          GEMINI_API_KEY: 'synthetic-api-key',
        },
      });
      assert.deepEqual(JSON.parse(output.trim()), { google: null, mode });
    });
  });
}
test('development still loads its local .env', async () => {
  await fixture(async (cwd) => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', command], {
      cwd,
      encoding: 'utf8',
      env: { ...base, NODE_ENV: 'development' },
    });
    assert.deepEqual(JSON.parse(output.trim()), { google: 'local-only-id', mode: 'development' });
  });
});
test('production fails when required secrets exist only in local .env', async () => {
  await fixture(async (cwd) => {
    const output = spawnSync(process.execPath, ['--input-type=module', '-e', command], {
      cwd,
      encoding: 'utf8',
      env: { ...base, NODE_ENV: 'production' },
    });
    assert.notEqual(output.status, 0);
    assert.match(output.stderr, /Invalid environment configuration/);
  });
});
