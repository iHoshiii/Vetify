import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { makeBookPdf } from '../src/server/test-utils/book-pdf.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'dist/server');
await readFile(join(source, 'package-lock.json')).catch(() => {
  throw new Error('Run npm run release:prod first to generate the runtime lockfile.');
});
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run through npm run test:release.');
const temporary = await mkdtemp(join(tmpdir(), 'vetify-release-smoke-'));
if (
  dirname(temporary) !== tmpdir() ||
  !temporary.split(/[\\/]/).at(-1).startsWith('vetify-release-smoke-')
) {
  throw new Error('Invalid smoke test directory');
}
let db;
let child;
let logs = '';
try {
  await cp(source, temporary, {
    recursive: true,
    filter: (path) => !path.split(/[\\/]/).includes('node_modules'),
  });
  execFileSync(process.execPath, [npmCli, 'ci', '--omit=dev', '--no-audit', '--no-fund'], {
    cwd: temporary,
    stdio: 'inherit',
  });
  const manifest = JSON.parse(await readFile(join(temporary, 'package.json'), 'utf8'));
  assert.ok(manifest.dependencies['pdfjs-dist']);
  for (const unwanted of ['react', 'vite', 'typescript', 'esbuild', 'husky'])
    assert.equal(manifest.dependencies[unwanted], undefined);
  await writeFile(
    join(temporary, '.env'),
    'GOOGLE_CLIENT_ID=unexpected-local-id\nGOOGLE_CLIENT_SECRET=unexpected-local-secret\n'
  );
  const message = 'Vetify release smoke test';
  await writeFile(join(temporary, 'worker-smoke.pdf'), makeBookPdf([[message]]));
  const workerCheck = `
    import {Worker} from 'node:worker_threads';
    import {readFileSync} from 'node:fs';
    const worker = new Worker(new URL('./book-pdf.worker.js', import.meta.url), {
      workerData: new Uint8Array(readFileSync('worker-smoke.pdf')),
      execArgv: [], resourceLimits: {maxOldGenerationSizeMb: 256}
    });
    const timer = setTimeout(()=>{worker.terminate();process.exitCode=1},30000);
    worker.once('message', async result=>{clearTimeout(timer);console.log(JSON.stringify(result));await worker.terminate()});
    worker.once('error', error=>{clearTimeout(timer);console.error(error);process.exitCode=1});
  `;
  const parsed = execFileSync(process.execPath, ['--input-type=module', '-e', workerCheck], {
    cwd: temporary,
    encoding: 'utf8',
    timeout: 35_000,
  });
  assert.deepEqual(JSON.parse(parsed.trim()), { pages: [message] });
  db = await MongoMemoryServer.create();
  const port = await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(path|systemroot|windir|temp|tmp|comspec|userprofile|home|homedrive|homepath)$/i.test(key)
    )
  );
  child = spawn(process.execPath, ['index.js'], {
    cwd: temporary,
    env: {
      ...base,
      NODE_ENV: 'test',
      PORT: String(port),
      MONGODB_URI: db.getUri('vetify_release_smoke'),
      JWT_SECRET_ACCESS: 'synthetic-signing-secret-at-least-32-characters',
      GEMINI_API_KEY: 'synthetic-api-key',
      OAUTH_FAILURE_REDIRECT: 'https://vetify.example.test/login?error=oauth',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (data) => {
      logs = (logs + data).slice(-6000);
    });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const response = await fetch(`${origin}/api/v1/health`, {
        signal: AbortSignal.timeout(1000),
      });
      const body = await response.json();
      if (response.ok && body.db === 'connected') {
        ready = true;
        break;
      }
    } catch {
      ready = false;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Built server did not become ready:\n${logs}`);
  const provider = await fetch(`${origin}/api/v1/auth/google`, { redirect: 'manual' });
  assert.equal(provider.status, 302);
  assert.equal(
    new URL(provider.headers.get('location')).searchParams.get('reason'),
    'unconfigured'
  );
  const login = await fetch(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.test', password: 'SyntheticPassword42!' }),
  });
  assert.equal(login.status, 401);
  assert.equal((await login.json()).reason, 'account-not-found');
  console.log(
    '[smoke] Isolated runtime install, PDF worker, MongoDB connection, auth route and local-env isolation passed.'
  );
} finally {
  if (child && child.exitCode === null) {
    const ended = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await ended;
  }
  await db?.stop();
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
