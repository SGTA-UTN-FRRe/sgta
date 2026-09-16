import { expect, test } from "@playwright/test";

test.describe("golden screen journeys", () => {
  test("renders the institutional login route", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar/ })).toBeVisible();
  });

  test("renders the admin overview and its schedule entry point", async ({
    page,
  }) => {
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Necesita/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver horarios/ })).toBeVisible();
  });

  test("renders the tutor directory search landmark", async ({ page }) => {
    await page.goto("/admin/tutores");

    await expect(page.getByRole("heading", { name: "Tutores" })).toBeVisible();
    await expect(
      page.getByRole("searchbox", { name: "Buscar tutor" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar tutor" })).toBeVisible();
  });

  test("opens and closes the movement dialog", async ({ page }) => {
    await page.goto("/admin/horas");

    await page.getByRole("button", { name: /Registrar movimiento/ }).click();

    const dialog = page.getByRole("dialog", { name: /Registrar movimiento/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("checkbox").first()).toBeChecked();
    await expect(dialog.getByText(/Resumen/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });

  test("switches schedule plans and compact days", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/horarios");

    await expect(page.getByRole("heading", { name: "Horarios" })).toBeVisible();

    const planTabs = page.locator('[role="tablist"]').first().getByRole("tab");
    await expect(planTabs.first()).toHaveAttribute("aria-selected", "true");
    await planTabs.nth(1).click();
    await expect(planTabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("status").filter({ hasText: /no tiene/ })).toBeVisible();

    await planTabs.first().click();
    const dayTabs = page.locator('[role="tablist"]').nth(1).getByRole("tab");
    await dayTabs.nth(1).click();
    await expect(dayTabs.nth(1)).toHaveAttribute("aria-selected", "true");
  });
});
