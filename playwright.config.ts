import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  // Budgets are set once here; specs must not override them.
  timeout: 60_000,
  retries: isCI ? 1 : 0,
  forbidOnly: isCI,
  // Authenticated journeys share one mutable database, so avoid overlapping writes.
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  expect: {
    timeout: 15_000,
  },
  webServer: {
    command: "corepack pnpm exec tsx tests/e2e/web-server.ts",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/admin-cycle-lifecycle.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "cycle-lifecycle",
      dependencies: ["chromium"],
      testMatch: "**/admin-cycle-lifecycle.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
