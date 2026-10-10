import { expect, test } from "./fixtures";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SIGN_OUT_SESSION_TOKEN,
  E2E_AUTH_SECRET,
} from "./e2e-test-data";
import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";
import { addE2ESessionCookie } from "./session-cookie";
import {
  activateWithKeyboard,
  expectReducedMotion,
  expectAccessibleOverlay,
  selectWithKeyboard,
  setCheckboxWithKeyboard,
} from "./keyboard-helpers";

test.describe("authenticated Admin tutor operations", () => {
  test("creates a tutor and reads derived Materias coverage", async ({
    context,
    page,
  }) => {
    const accessibilityViolations: string[] = [];
    const signedSessionToken = `${E2E_ADMIN_SIGN_OUT_SESSION_TOKEN}.${await makeSignature(
      E2E_ADMIN_SIGN_OUT_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;

    await addE2ESessionCookie(context, signedSessionToken);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/tutors");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tutores" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table").getByText("Lovelace, Ada"),
    ).toBeVisible();

    const rowAction = page.getByRole("button", { name: "Desactivar tutor Lovelace, Ada" });
    const statusConfirmation = page.getByRole("alertdialog", { name: "Desactivar tutor" });
    await expectAccessibleOverlay(page, { trigger: rowAction, overlay: statusConfirmation });
    await activateWithKeyboard(page, rowAction);
    await expect(statusConfirmation.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await expectReducedMotion(statusConfirmation);
    await page.keyboard.press("Tab");
    await expect(statusConfirmation.getByRole("button", { name: "Desactivar tutor" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(statusConfirmation.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(rowAction).toBeFocused();

    const addTutor = page.getByRole("button", { name: "Agregar tutor" });
    await expectAccessibleOverlay(page, { trigger: addTutor, overlay: page.getByRole("dialog", { name: "Agregar tutor" }) });
    await activateWithKeyboard(page, addTutor);
    const unsavedSheet = page.getByRole("dialog", { name: "Agregar tutor" });
    await unsavedSheet.getByLabel("Nombre", { exact: true }).fill("Prueba");
    await expectAccessibleOverlay(page, {
      trigger: unsavedSheet.getByRole("button", { name: "Cerrar panel de tutor" }),
      overlay: page.getByRole("alertdialog", { name: "¿Cerrar la ficha?" }),
    });
    await expect(unsavedSheet.getByLabel("Nombre", { exact: true })).toHaveValue("Prueba");
    await activateWithKeyboard(page, unsavedSheet.getByRole("button", { name: "Cerrar panel de tutor" }));
    await activateWithKeyboard(page, page.getByRole("alertdialog").getByRole("button", { name: "Cerrar", exact: true }));
    await expect(addTutor).toBeFocused();
    const tutorName = page.getByRole("button", { name: "Lovelace, Ada", exact: true });
    await expectAccessibleOverlay(page, { trigger: tutorName, overlay: page.getByRole("dialog", { name: "Detalle de Lovelace, Ada" }) });

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
    await dialog.getByRole("textbox", { name: "Apellido (opcional)", exact: true }).fill("Johnson");
    await selectWithKeyboard(page, dialog.getByLabel("Carrera"), { label: "Computer Science" });
    await setCheckboxWithKeyboard(page, dialog.getByRole("checkbox", { name: "Algorithms" }), true);
    await selectWithKeyboard(page, dialog.getByLabel("Ciclo abierto"), { label: "2027" });
    await activateWithKeyboard(page, dialog.getByRole("button", { name: "Agregar tutor" }));

    await expect(page.getByText("Cambios guardados", { exact: true })).toBeVisible();
    await expectReducedMotion(page.getByText("Cambios guardados", { exact: true }));
    await expect(
      page.getByRole("table").getByText("Johnson, Katherine"),
    ).toBeVisible();

    for (const viewport of [
      { width: 390, height: 844, layout: "compact" },
      { width: 820, height: 900, layout: "medium" },
      { width: 1280, height: 900, layout: "wide" },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole(viewport.layout === "compact" ? "list" : "table", { name: "Lista de tutores" })).toBeVisible();

      if (viewport.layout === "compact") {
        const menuTrigger = page.getByRole("button", { name: "Acciones para Lovelace, Ada" });
        await activateWithKeyboard(page, menuTrigger);
        const menu = page.getByRole("menu", { name: "Acciones para Lovelace, Ada" });
        await expectReducedMotion(menu);
        await expect(menu.getByRole("menuitem", { name: "Ver detalle" })).toBeFocused();
        await page.keyboard.press("End");
        await expect(menu.getByRole("menuitem", { name: "Desactivar tutor" })).toBeFocused();
        await page.keyboard.press("ArrowDown");
        await expect(menu.getByRole("menuitem", { name: "Ver detalle" })).toBeFocused();
        await page.keyboard.press("ArrowUp");
        await expect(menu.getByRole("menuitem", { name: "Desactivar tutor" })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menuTrigger).toBeFocused();
        await activateWithKeyboard(page, menuTrigger);
        await page.keyboard.press("Enter");
        const detail = page.getByRole("dialog", { name: "Detalle de Lovelace, Ada" });
        await expect(detail).toBeVisible();
        await expect(detail.getByRole("button", { name: "Cerrar panel de tutor" })).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(menuTrigger).toBeFocused();

        await activateWithKeyboard(page, page.getByRole("button", { name: "Abrir navegación" }));
        await expect(page.getByRole("dialog").getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
        await page.keyboard.press("Escape");
      } else {
        const signOut = page.getByRole("button", { name: "Cerrar sesión" });
        await expect(signOut).toBeVisible();
        await expect(signOut).toHaveAttribute("title", "Cerrar sesión");
        if (viewport.layout === "medium") {
          await expect(signOut.locator("span")).toBeHidden();
        }
      }
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

    const signOutResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/sign-out") && response.request().method() === "POST",
    );
    await activateWithKeyboard(page, page.getByRole("button", { name: "Cerrar sesión" }));
    expect((await signOutResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/admin/tutors");
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/admin/tutors")).status()).toBe(401);

    // Replaying the original cookie also fails after the server revokes the session.
    await addE2ESessionCookie(context, signedSessionToken);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login$/);
  });
});
