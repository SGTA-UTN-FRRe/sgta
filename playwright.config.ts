import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Authenticated journeys share one mutable database, so avoid overlapping writes.
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  expect: {
    timeout: 15_000,
  },
  webServer: {
    command: "corepack pnpm exec tsx tests/e2e/web-server.ts",
    url: "http://localhost:3000",
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
