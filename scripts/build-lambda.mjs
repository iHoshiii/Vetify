import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist/lambda');
if (relative(root, output) !== join('dist', 'lambda')) throw new Error('Invalid Lambda output');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: {
    http: 'src/server/lambda/http.ts',
    websocket: 'src/server/lambda/websocket.ts',
    maintenance: 'src/server/lambda/maintenance.ts',
    'clinic-refresh': 'src/server/lambda/clinic-refresh.ts',
  },
  outdir: output,
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  tsconfig: 'tsconfig.lambda.json',
  metafile: true,
  logLevel: 'info',
});
const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const names = new Set();
for (const file of Object.values(result.metafile.outputs))
  for (const imported of file.imports.filter((item) => item.external)) {
    if (imported.path.startsWith('node:') || builtinModules.includes(imported.path)) continue;
    if (imported.path.startsWith('.') || imported.path.startsWith('/'))
      throw new Error(`Unbundled import: ${imported.path}`);
    names.add(
      imported.path
        .split('/')
        .slice(0, imported.path.startsWith('@') ? 2 : 1)
        .join('/')
    );
  }
const dependencies = {};
for (const name of [...names].sort()) {
  const version = lock.packages?.[`node_modules/${name}`]?.version;
  if (!source.dependencies[name] || !version)
    throw new Error(`Missing runtime dependency: ${name}`);
  dependencies[name] = version;
}
await writeFile(
  join(output, 'package.json'),
  JSON.stringify(
    { name: 'vetify-lambda', version: source.version, private: true, type: 'module', dependencies },
    null,
    2
  ) + '\n'
);
if (!process.env.npm_execpath) throw new Error('Run through npm run build:lambda');
execFileSync(
  process.execPath,
  [
    process.env.npm_execpath,
    'install',
    '--package-lock-only',
    '--ignore-scripts',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
  ],
  { cwd: output, stdio: 'inherit' }
);
console.log('[lambda] Built HTTP, WebSocket and scheduled handlers without private env files.');
