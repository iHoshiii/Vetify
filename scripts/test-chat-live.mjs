import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--project',
    'server',
    'src/server/services/__tests__/chat-topic.live.test.ts',
    '--reporter=verbose',
  ],
  {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, VETIFY_LIVE_CHAT_TESTS: '1' },
    stdio: 'inherit',
  }
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
