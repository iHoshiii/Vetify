import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function availablePort() {
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port } = listener.address();
  await new Promise((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve()))
  );
  return port;
}

async function waitForHealth(server, port, output) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Built server exited:\n${output()}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`, {
        signal: AbortSignal.timeout(1000),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).db, 'connected');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Built server never became ready:\n${output()}`);
}

const temporaryRoot = resolve(tmpdir());
const cwd = await mkdtemp(join(temporaryRoot, 'vetify-production-smoke-'));
let mongo;
let server;
try {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60_000 } });
  const uri = mongo.getUri('vetify_smoke');
  const db = new MongoClient(uri);
  await db.connect();
  try {
    await db.db().collection('osmClinicCache').insertOne({
      _id: 'philippines',
      clinics: [],
      refreshedAt: new Date(),
    });
  } finally {
    await db.close();
  }
  const port = await availablePort();
  const systemEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(path|systemroot|windir|temp|tmp|home|userprofile|comspec|pathext|lang)$/i.test(key)
    )
  );
  server = spawn(
    process.execPath,
    ['--enable-source-maps', fileURLToPath(new URL('../dist/server/index.js', import.meta.url))],
    {
      cwd,
      env: {
        ...systemEnv,
        NODE_ENV: 'production',
        PORT: String(port),
        MONGODB_URI: uri,
        BEDROCK_REGION: 'ap-southeast-2',
        JWT_SECRET_ACCESS: 'production-smoke-only-secret-at-least-32-characters',
        MAIL_TRANSPORT: 'log',
        CLIENT_ORIGIN: `http://127.0.0.1:${port}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }
  );
  let output = '';
  server.stdout.on('data', (data) => {
    output += data.toString();
  });
  server.stderr.on('data', (data) => {
    output += data.toString();
  });
  await waitForHealth(server, port, () => output);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/v1/books`)).status, 404);
  console.log(
    'Production server starts with a connected temporary database; Books API is no longer mounted.'
  );
} finally {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
  await mongo?.stop();
  assert.equal(dirname(resolve(cwd)), temporaryRoot);
  assert.ok(basename(cwd).startsWith('vetify-production-smoke-'));
  await rm(cwd, { recursive: true, force: true });
}
