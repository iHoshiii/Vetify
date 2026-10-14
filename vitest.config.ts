import { defineConfig } from 'vitest/config';

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
