import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineWorkspace } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, './src/client'),
  '@shared': path.resolve(__dirname, './src/shared'),
};

// Two environments: the client suite needs a DOM, the server suite needs real
// Node built-ins (crypto, net) that jsdom shims or omits.
export default defineWorkspace([
  {
    plugins: [react()],
    envDir: path.resolve(__dirname, 'node_modules/.cache/vitest-env'),
    resolve: { alias },
    test: {
      name: 'client',
      environment: 'jsdom',
      globals: true,
      setupFiles: 'src/client/__tests__/setup.ts',
      include: ['src/client/__tests__/**/*.{test,spec}.{ts,tsx}'],
    },
  },
  {
    envDir: path.resolve(__dirname, 'node_modules/.cache/vitest-env'),
    resolve: { alias },
    test: {
      name: 'server',
      environment: 'node',
      // Tests use synthetic settings and never load a developer's local .env.
      env: {
        NODE_ENV: 'test',
        MAIL_TRANSPORT: 'log',
        AUTH_MAIL_TRANSPORT: 'log',
        BEDROCK_REGION: 'ap-southeast-2',
        JWT_SECRET_ACCESS: 'synthetic-test-signing-secret-at-least-32-characters',
      },
      globals: true,
      include: ['src/server/**/*.{test,spec}.ts'],
      // Spinning up mongodb-memory-server downloads a binary on first run.
      testTimeout: 30_000,
      hookTimeout: 120_000,
    },
  },
]);
