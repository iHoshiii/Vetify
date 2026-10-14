import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../', import.meta.url));
const outdir = fileURLToPath(new URL('../dist/server/', import.meta.url));
assert.equal(relative(root, outdir), join('dist', 'server'));
await rm(outdir, { recursive: true, force: true });
await build({
  absWorkingDir: root,
  entryPoints: {
    index: 'src/server/index.ts',
    'book-pdf.worker': 'src/server/services/book-pdf.worker.ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  packages: 'external',
  outdir,
  tsconfig: 'tsconfig.server.json',
  sourcemap: true,
  logLevel: 'info',
});
