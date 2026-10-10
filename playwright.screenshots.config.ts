import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testDir: "./tests/screenshots",
  testMatch: "**/*.screenshot.ts",
  retries: 0,
  outputDir: "test-results/screenshots-run",
  reporter: [["list"]],
  webServer: {
    ...baseConfig.webServer,
    command: "corepack pnpm exec tsx tests/screenshots/web-server.ts",
  },
  projects: ["review", "readme"].map((name) => ({
    name,
    testMatch: `**/${name}.screenshot.ts`,
    use: {
      ...devices["Desktop Chrome"],
      colorScheme: "light",
      reducedMotion: "reduce",
    },
  })),
});
