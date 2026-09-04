import { expect, test } from "@playwright/test";

test("shows the SGTA landing page", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Sistema de Gestión de Tutorías" }),
  ).toBeVisible();
});
