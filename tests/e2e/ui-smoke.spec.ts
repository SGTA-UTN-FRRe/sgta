import { expect, test } from "@playwright/test";

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
  });

  test("redirects unauthenticated admin routes to login", async ({ page }) => {
    for (const route of [
      "/admin",
      "/admin/tutors",
      "/admin/tutors/subjects",
      "/admin/settings",
      "/admin/hours",
      "/admin/schedules",
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
