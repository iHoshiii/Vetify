import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineWorkspace } from 'vitest/config';

const alias = {
  '@': path.resolve(__dirname, './src'),
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
      setupFiles: 'src/__tests__/setup.ts',
      include: ['src/__tests__/**/*.{test,spec}.{ts,tsx}', 'src/client/**/*.{test,spec}.{ts,tsx}'],
    },
  },
  {
    resolve: { alias },
    test: {
      name: 'server',
      environment: 'node',
      globals: true,
      include: ['src/server/**/*.{test,spec}.ts'],
      // Spinning up mongodb-memory-server downloads a binary on first run.
      testTimeout: 30_000,
      hookTimeout: 120_000,
    },
  },
]);
