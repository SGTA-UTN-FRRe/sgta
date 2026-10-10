import type { BrowserContext, Page } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";
import { E2E_AUTH_SECRET } from "../e2e/e2e-test-data";
import { addE2ESessionCookie } from "../e2e/session-cookie";
import { expect } from "../e2e/fixtures";
import { DEMO_FIXED_NOW, DEMO_SESSION_TOKENS } from "./demo-data";
import type { ScreenshotRoute } from "./routes";

export async function prepareCapture(context: BrowserContext, page: Page, route: ScreenshotRoute) {
  await context.clock.setFixedTime(new Date(DEMO_FIXED_NOW));
  if (route.session !== "none") {
    const token = DEMO_SESSION_TOKENS[route.session];
    await addE2ESessionCookie(context, `${token}.${await makeSignature(token, E2E_AUTH_SECRET)}`);
  }
  const response = await page.goto(route.path);
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe(new URL(route.path, "http://localhost:3000").pathname);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByText(/No se pud(o|ieron) cargar|No se pudo obtener|Revise los filtros seleccionados|E2E|Computer Science|Ada Tutor/)).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
}
