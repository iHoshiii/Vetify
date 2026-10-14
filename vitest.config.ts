import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  envDir: path.resolve(__dirname, 'node_modules/.cache/vitest-env'),
  plugins: [react()],
  test: {
    workspace: './vitest.workspace.ts',
    minWorkers: 1,
    maxWorkers: 2,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'test-results/**'],
  },
});
