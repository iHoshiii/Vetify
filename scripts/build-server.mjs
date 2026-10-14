import { build } from 'esbuild';
import { builtinModules } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist/server');
if (relative(root, output) !== join('dist', 'server')) throw new Error('Invalid build directory');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: {
    index: 'src/server/index.ts',
    'book-pdf.worker': 'src/server/services/book-pdf.worker.ts',
  },
  outdir: output,
  tsconfig: 'tsconfig.server.json',
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  metafile: true,
  logLevel: 'info',
});
const source = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const packages = new Set();
for (const file of Object.values(result.metafile.outputs)) {
  for (const imported of file.imports.filter((item) => item.external)) {
    const name = imported.path;
    if (name.startsWith('node:') || builtinModules.includes(name)) continue;
    if (name.startsWith('.') || name.startsWith('/')) throw new Error(`Unbundled import: ${name}`);
    packages.add(
      name
        .split('/')
        .slice(0, name.startsWith('@') ? 2 : 1)
        .join('/')
    );
  }
}
const dependencies = {};
for (const name of [...packages].sort()) {
  const version = lock.packages?.[`node_modules/${name}`]?.version;
  if (!source.dependencies[name] || !version)
    throw new Error(`Missing runtime dependency: ${name}`);
  dependencies[name] = version;
}
await writeFile(
  join(output, 'package.json'),
  JSON.stringify(
    {
      name: 'vetify-server',
      version: source.version,
      private: true,
      type: 'module',
      engines: { node: '>=24' },
      scripts: { start: 'node index.js' },
      dependencies,
    },
    null,
    2
  ) + '\n'
);
console.log(`[build] Server and PDF worker bundled with ${packages.size} runtime dependencies.`);
