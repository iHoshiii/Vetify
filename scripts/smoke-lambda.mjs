import { execFileSync, spawn } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.npm_execpath) throw new Error('Run through npm run test:lambda');
const stage = await mkdtemp(join(tmpdir(), 'vetify-lambda-smoke-'));
if (dirname(stage) !== tmpdir() || !stage.split(/[\\/]/).at(-1).startsWith('vetify-lambda-smoke-'))
  throw new Error('Invalid smoke directory');
let mongo;
try {
  for (const file of [
    'http.js',
    'websocket.js',
    'maintenance.js',
    'package.json',
    'package-lock.json',
  ])
    await cp(join(root, 'dist/lambda', file), join(stage, file));
  await cp(join(root, 'scripts/lambda-smoke-runtime.mjs'), join(stage, 'smoke.mjs'));
  execFileSync(
    process.execPath,
    [process.env.npm_execpath, 'ci', '--omit=dev', '--no-audit', '--no-fund'],
    { cwd: stage, stdio: 'inherit' }
  );
  mongo = await MongoMemoryServer.create();
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) =>
      /^(path|systemroot|windir|temp|tmp|comspec|userprofile|home|homedrive|homepath)$/i.test(key)
    )
  );
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(stage, 'smoke.mjs')], {
      cwd: stage,
      stdio: 'inherit',
      env: {
        ...env,
        NODE_ENV: 'test',
        MONGODB_URI: mongo.getUri(),
        JWT_SECRET_ACCESS: 'synthetic-lambda-signing-secret-32-characters',
        GEMINI_API_KEY: 'synthetic-gemini-key',
        CLIENT_ORIGIN: 'https://vetify.page',
        AUTH_MAIL_TRANSPORT: 'log',
        MAIL_TRANSPORT: 'log',
        AWS_ACCESS_KEY_ID: 'SYNTHETICACCESSKEY',
        AWS_SECRET_ACCESS_KEY: 'synthetic-secret-never-used-against-aws',
        AWS_REGION: 'ap-southeast-1',
      },
    });
    const timer = setTimeout(() => child.kill(), 90_000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Lambda runtime smoke failed (${code})`));
    });
  });
} finally {
  await mongo?.stop();
  await rm(stage, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
}
console.log(
  '[lambda] Isolated runtime install, HTTP signup/ticket, gateway delivery and cleanup passed.'
);
