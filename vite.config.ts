import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // '@' points at src/client (not src) so that existing '@/components/*',
      // '@/hooks/*' and '@/types/*' imports keep resolving after the move.
      '@': path.resolve(__dirname, 'src/client'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    // Proxy keeps the browser on a single origin, so SameSite=Lax auth cookies
    // work without CORS or Secure-context complications in dev.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // ws:true upgrades the socket.io handshake, so real-time rides the same dev origin as /api.
      '/socket.io': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
  },
});
