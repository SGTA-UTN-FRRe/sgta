// @vitest-environment node

import { describe, expect, it } from "vitest";

import config from "../../playwright.config";

describe("Playwright configuration", () => {
  it("keeps browser collection and shared execution budgets explicit", () => {
    const actionTimeout = config.use?.actionTimeout ?? 0;
    const assertionTimeout = config.expect?.timeout ?? 0;
    const navigationTimeout = config.use?.navigationTimeout ?? 0;
    const testTimeout = config.timeout ?? 0;
    const globalTimeout = config.globalTimeout ?? 0;
    const webServerTimeout =
      typeof config.webServer === "object" && !Array.isArray(config.webServer)
        ? (config.webServer.timeout ?? 0)
        : 0;

    expect(actionTimeout).toBe(10_000);
    expect(assertionTimeout).toBe(15_000);
    expect(navigationTimeout).toBe(30_000);
    expect(testTimeout).toBe(60_000);
    expect(webServerTimeout).toBe(120_000);
    expect(globalTimeout).toBe(10 * 60_000);
    expect(globalTimeout).toBeLessThan(15 * 60_000);
    expect(actionTimeout).toBeLessThan(assertionTimeout);
    expect(assertionTimeout).toBeLessThan(navigationTimeout);
    expect(navigationTimeout).toBeLessThan(testTimeout);
    expect(config.workers).toBe(1);
    expect(config.testMatch).toBe("**/*.spec.ts");
  });
});
