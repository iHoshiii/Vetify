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
    resolve: { alias },
    test: {
      name: 'server',
      environment: 'node',
      // A developer's .env decides how this machine mails; the suite must not
      // follow it. Under MAIL_TRANSPORT=http every test that invites somebody
      // either posts to a real provider or fails on a key it never needed.
      // process.loadEnvFile() leaves an already-set variable alone, so this wins.
      env: {
        NODE_ENV: 'test',
        GEMINI_API_KEY: 'test-gemini-key',
        JWT_SECRET_ACCESS: 'test-only-access-secret-at-least-32-characters',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/vetify_tests',
        MAIL_TRANSPORT: 'log',
        MAIL_API_KEY: '',
        DNS_SERVERS: '',
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        FACEBOOK_APP_ID: '',
        FACEBOOK_APP_SECRET: '',
        TIKTOK_CLIENT_KEY: '',
        TIKTOK_CLIENT_SECRET: '',
      },
      globals: true,
      include: ['src/server/**/*.{test,spec}.ts'],
      // Spinning up mongodb-memory-server downloads a binary on first run.
      testTimeout: 30_000,
      hookTimeout: 120_000,
    },
  },
]);
