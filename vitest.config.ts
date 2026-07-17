import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/__tests__/setup.ts',
    exclude: ['tests/e2e/**', 'node_modules/**'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}', 'src/**/__tests__/**/*.{ts,tsx,js}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
