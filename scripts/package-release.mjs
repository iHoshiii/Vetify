import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runNode = (script, args = []) =>
  execFileSync(process.execPath, [join(root, script), ...args], {
    cwd: root,
    stdio: 'inherit',
  });
runNode('scripts/build-client-prod.mjs', process.argv.slice(2));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through npm run release:prod.');
execFileSync(
  process.execPath,
  [npmCli, 'exec', '--', 'tsc', '-p', 'tsconfig.server.json', '--noEmit'],
  {
    cwd: root,
    stdio: 'inherit',
  }
);
runNode('scripts/build-server.mjs');
const server = join(root, 'dist/server');
execFileSync(
  process.execPath,
  [
    npmCli,
    'install',
    '--package-lock-only',
    '--ignore-scripts',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
  ],
  {
    cwd: server,
    stdio: 'inherit',
  }
);
const stage = resolve(root, 'dist/release');
if (relative(root, stage) !== join('dist', 'release')) throw new Error('Invalid release directory');
await rm(stage, { recursive: true, force: true });
await mkdir(join(stage, 'server'), { recursive: true });
for (const name of ['index.js', 'package.json', 'package-lock.json']) {
  await cp(join(server, name), join(stage, 'server', name));
}
await cp(join(root, 'dist/client'), join(stage, 'public'), { recursive: true });
await mkdir(join(stage, 'config'), { recursive: true });
for (const name of [
  'Caddyfile',
  'vetify.service',
  'bootstrap.sh',
  'install-release.sh',
  'verify.sh',
]) {
  const content = (await readFile(join(root, 'deploy/lightsail', name), 'utf8')).replace(
    /\r\n/g,
    '\n'
  );
  await writeFile(join(stage, 'config', name), content);
}
for (const item of await readdir(stage, { recursive: true, withFileTypes: true })) {
  if (
    item.isSymbolicLink() ||
    item.name === 'node_modules' ||
    item.name === 'env.prod' ||
    /^\.env(?:$|\.)/.test(item.name) ||
    /\.pem$/i.test(item.name)
  ) {
    throw new Error(`Unexpected private file or symlink in release: ${item.name}`);
  }
}
const archive = join(root, 'dist/vetify-release.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', stage, 'server', 'public', 'config'], {
  stdio: 'inherit',
});
console.log(
  '[release] dist/vetify-release.tar.gz contains server, website and deployment configs; no environment files or node_modules.'
);
