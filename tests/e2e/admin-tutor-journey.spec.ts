import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
} from "./e2e-test-data";

test.describe("authenticated Admin tutor operations", () => {
  test("creates a tutor and reads derived Materias coverage", async ({
    context,
    page,
  }) => {
    const signedSessionToken = `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(
      E2E_ADMIN_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;

    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: signedSessionToken,
        url: "http://localhost:3000",
      },
    ]);

    await page.goto("/admin/tutors");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tutores" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-layout="wide"]').getByText("Lovelace, Ada"),
    ).toBeVisible();

    await page.getByRole("button", { name: "Agregar tutor" }).click();
    const dialog = page.getByRole("dialog", { name: "Agregar tutor" });
    await dialog.getByRole("textbox", { name: "Nombre", exact: true }).fill("Katherine");
    await dialog.getByRole("textbox", { name: "Apellido", exact: true }).fill("Johnson");
    await dialog.getByLabel("Carrera").selectOption({ label: "Computer Science" });
    await dialog.getByRole("checkbox", { name: "Algorithms" }).check();
    await dialog.getByLabel("Ciclo abierto").selectOption({ label: "2027" });
    await dialog.getByRole("button", { name: "Agregar tutor" }).click();

    await expect(page.getByRole("status")).toContainText("Cambios guardados");
    await expect(
      page.locator('[data-layout="wide"]').getByText("Johnson, Katherine"),
    ).toBeVisible();

    for (const viewport of [
      { width: 390, height: 844, layout: "compact" },
      { width: 820, height: 900, layout: "medium" },
      { width: 1280, height: 900, layout: "wide" },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.locator(`[data-layout="${viewport.layout}"]`)).toBeVisible();
    }

    await page.goto("/admin/tutors/subjects");
    await expect(
      page.getByRole("heading", { level: 1, name: "Materias" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-layout="wide"]').getByText("Algorithms"),
    ).toBeVisible();
    await expect(
      page.locator('[data-layout="wide"]').getByText("Lovelace, Ada"),
    ).toBeVisible();
    await expect(
      page.locator('[data-layout="wide"]').getByText("Johnson, Katherine"),
    ).toBeVisible();

    for (const viewport of [
      { width: 390, height: 844, layout: "compact" },
      { width: 820, height: 900, layout: "medium" },
      { width: 1280, height: 900, layout: "wide" },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.locator(`[data-layout="${viewport.layout}"]`)).toBeVisible();
    }
  });
});
