import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/integration/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 120_000,
    testTimeout: 60_000,
  },
});
