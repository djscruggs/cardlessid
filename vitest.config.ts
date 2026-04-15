import { defineConfig } from "vitest/config";
import { reactRouter } from "@react-router/dev/vite";
import path from "path";

export default defineConfig({
  plugins: [reactRouter()],
  test: {
    environment: "happy-dom",
    globals: true,
    testTimeout: 15000,
    setupFiles: ["./vitest.setup.ts"],
    // Server-only test files run in Node so .server.ts imports are permitted.
    // environmentMatchGlobs is the supported per-file override in vitest 3.x
    // (test.projects requires separate vite config files, incompatible with
    // the React Router plugin constraint that a vite.config.ts must exist).
    environmentMatchGlobs: [
      ["app/__tests__/nonce.test.ts", "node"],
      ["app/__tests__/proof-cache.test.ts", "node"],
      ["app/__tests__/algorand-verify.test.ts", "node"],
      ["app/__tests__/v-endpoints.test.ts", "node"],
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/cardlessid-algorand/**",
    ],
    include: ["app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
});
