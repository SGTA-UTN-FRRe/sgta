import { expect, test } from "@playwright/test";

import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";

test.describe("UI smoke journeys", () => {
  test("redirects the root route to login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("renders the institutional login route", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar/ })).toBeVisible();
    const accessibilityViolations = await collectSeriousAccessibilityViolations(
      page,
      "Login default state",
    );
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });

  test("announces login errors and permission denial at supported widths", async ({
    page,
  }) => {
    const accessibilityViolations: string[] = [];
    for (const width of [390, 900, 1440]) {
      await page.setViewportSize({ height: 900, width });
      await page.goto("/login?error=internal_server_error");

      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "No pudimos iniciar sesión",
      );
      await page.keyboard.press("Tab");
      const retry = page.getByRole("button", { name: "Reintentar" });
      await expect(retry).toBeFocused();
      await expect
        .poll(() => retry.evaluate((element) => getComputedStyle(element).boxShadow))
        .not.toBe("none");

      const errorWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      }));
      expect(errorWidths.scroll).toBeLessThanOrEqual(errorWidths.client);
      accessibilityViolations.push(
        ...(await collectSeriousAccessibilityViolations(
          page,
          `Login technical-error state at ${width}px`,
        )),
      );

      await page.goto("/login?error=signup_disabled");
      await expect(page.getByRole("status")).toContainText(
        "Esta cuenta no está habilitada en SGTA",
      );
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Continuar con Google" }),
      ).toBeFocused();

      const deniedWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      }));
      expect(deniedWidths.scroll).toBeLessThanOrEqual(deniedWidths.client);
      accessibilityViolations.push(
        ...(await collectSeriousAccessibilityViolations(
          page,
          `Login permission-denied state at ${width}px`,
        )),
      );
    }

    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });

  test("redirects unauthenticated admin routes to login", async ({ page }) => {
    for (const route of [
      "/admin",
      "/admin/tutors",
      "/admin/tutors/subjects",
      "/admin/settings",
      "/admin/hours",
      "/admin/hours/movements",
      "/admin/schedules",
      "/admin/schedules/attendance",
      "/admin/consultations",
      "/admin/reports",
    ]) {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("redirects unauthenticated tutor routes to login", async ({ page }) => {
    for (const route of ["/tutor", "/tutor/schedule", "/tutor/hours"]) {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
