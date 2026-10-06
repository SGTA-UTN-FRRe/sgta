import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "client-only": fileURLToPath(
        new URL("./node_modules/next/dist/compiled/client-only/index.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["tests/e2e/**", "tests/integration/**", "node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
