import { test as base, type Page } from "@playwright/test";

import { E2E_FIXED_NOW } from "./e2e-test-data";

export async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: "attached" });
}

export const test = base.extend<{ page: Page }>({
  context: async ({ context }, runContext) => {
    await context.clock.setFixedTime(new Date(E2E_FIXED_NOW));
    await runContext(context);
  },
  page: async ({ page }, runTest) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);

    page.goto = async (...args) => {
      const response = await goto(...args);
      if (response?.headers()["content-type"]?.includes("text/html")) {
        await waitForHydration(page);
      }
      return response;
    };

    page.reload = async (...args) => {
      const response = await reload(...args);
      if (response?.headers()["content-type"]?.includes("text/html")) {
        await waitForHydration(page);
      }
      return response;
    };

    await runTest(page);
  },
});

export { expect } from "@playwright/test";
