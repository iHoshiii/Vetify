import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const option = process.argv.slice(2).find((argument) => argument.startsWith('--env-file='));
const envPath = resolve(root, option?.slice('--env-file='.length) ?? 'env.prod');
let settings;
try {
  settings = parseEnv(await readFile(envPath, 'utf8'));
} catch {
  throw new Error(
    'Production file missing. Copy env.prod.example to env.prod, or pass --env-file=PATH.'
  );
}
const apiUrl = settings.VITE_API_URL || '/api/v1';
if (apiUrl !== '/api/v1' && !apiUrl.startsWith('https://')) {
  throw new Error('VITE_API_URL must be /api/v1 or an HTTPS production API URL.');
}
const isolatedEnvDir = await mkdtemp(join(tmpdir(), 'vetify-vite-env-'));
if (
  dirname(isolatedEnvDir) !== tmpdir() ||
  !isolatedEnvDir.split(/[\\/]/).at(-1).startsWith('vetify-vite-env-')
) {
  throw new Error('Invalid temporary environment directory');
}
process.env.NODE_ENV = 'production';
try {
  execFileSync(process.execPath, [join(root, 'scripts/copy-mediapipe.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
  const { build } = await import('vite');
  await build({
    root,
    configFile: join(root, 'vite.config.ts'),
    envDir: isolatedEnvDir,
    mode: 'production',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_CARTO_KEY': JSON.stringify(settings.VITE_CARTO_KEY || ''),
    },
  });
} finally {
  await rm(isolatedEnvDir, { recursive: true, force: true });
}
