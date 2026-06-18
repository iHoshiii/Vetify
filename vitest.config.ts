import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "apps/web/src/__tests__/setup.ts",
    exclude: ["tests/e2e/**", "node_modules/**"],
    include: ["apps/web/src/**/*.{test,spec}.{js,ts,tsx}", "apps/web/src/**/__tests__/**/*.{ts,tsx,js}", "archive/src_backup/**/__tests__/**/*.{ts,tsx,js}"],
  },
  resolve: {
      alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
    },
  },
});
