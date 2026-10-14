import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    workspace: './vitest.workspace.ts',
    minWorkers: 1,
    maxWorkers: 2,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**', 'test-results/**'],
  },
});
