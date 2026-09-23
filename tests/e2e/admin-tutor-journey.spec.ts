import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
} from "./e2e-test-data";
import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";
import {
  activateWithKeyboard,
  expectReducedMotion,
  selectWithKeyboard,
  setCheckboxWithKeyboard,
} from "./keyboard-helpers";

test.describe("authenticated Admin tutor operations", () => {
  test("creates a tutor and reads derived Materias coverage", async ({
    context,
    page,
  }) => {
    const accessibilityViolations: string[] = [];
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

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/tutors");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tutores" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-layout="wide"]').getByText("Lovelace, Ada"),
    ).toBeVisible();

    const rowAction = page.getByRole("button", { name: "Acciones para Lovelace, Ada" });
    await activateWithKeyboard(page, rowAction);
    const rowMenu = page.getByRole("menu", { name: "Acciones para Lovelace, Ada" });
    await expectReducedMotion(rowMenu);
    await expect(rowMenu.getByRole("menuitem", { name: "Ver detalle" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(rowMenu.getByRole("menuitem", { name: "Desactivar tutor" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(rowMenu.getByRole("menuitem", { name: "Ver detalle" })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(rowMenu.getByRole("menuitem", { name: "Desactivar tutor" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(rowAction).toBeFocused();

    await activateWithKeyboard(page, rowAction);
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    const statusConfirmation = page.getByRole("alertdialog", { name: "Desactivar tutor" });
    await expect(statusConfirmation.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await expectReducedMotion(statusConfirmation);
    await page.keyboard.press("Tab");
    await expect(
      statusConfirmation.getByRole("button", { name: "Desactivar tutor" }),
    ).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(statusConfirmation.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(rowAction).toBeFocused();

    await activateWithKeyboard(page, page.getByRole("button", { name: "Agregar tutor" }));
    const dialog = page.getByRole("dialog", { name: "Agregar tutor" });
    await expectReducedMotion(dialog);
    accessibilityViolations.push(
      ...(await collectSeriousAccessibilityViolations(
        page,
        "Add tutor dialog at Wide",
      )),
    );
    await dialog.getByRole("textbox", { name: "Nombre", exact: true }).fill("Katherine");
    await dialog.getByRole("textbox", { name: "Apellido", exact: true }).fill("Johnson");
    await selectWithKeyboard(page, dialog.getByLabel("Carrera"), { label: "Computer Science" });
    await setCheckboxWithKeyboard(page, dialog.getByRole("checkbox", { name: "Algorithms" }), true);
    await selectWithKeyboard(page, dialog.getByLabel("Ciclo abierto"), { label: "2027" });
    await activateWithKeyboard(page, dialog.getByRole("button", { name: "Agregar tutor" }));

    await expect(page.getByRole("status")).toContainText("Cambios guardados");
    await expectReducedMotion(page.getByRole("status"));
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
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });
});
