import { expect, test, waitForHydration } from "./fixtures";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_MEETING_CATEGORY_ID,
  E2E_PRIMARY_TUTOR_ID,
} from "./e2e-test-data";
import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";
import { addE2ESessionCookie } from "./session-cookie";
import {
  activateWithKeyboard,
  expectAccessibleOverlay,
  selectWithKeyboard,
  setCheckboxWithKeyboard,
} from "./keyboard-helpers";

test.describe("authenticated Admin hour operations", () => {
  test("registers selected meeting credit and reverses it from movement history", async ({
    context,
    page,
  }) => {
    const accessibilityViolations: string[] = [];
    const signedSessionToken = `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(
      E2E_ADMIN_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;

    await addE2ESessionCookie(context, signedSessionToken);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/hours");
    await expect(
      page.getByRole("heading", { level: 1, name: "Horas" }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Saldos de horas" }).getByRole("listitem").filter({ hasText: "Lovelace, Ada" }),
    ).toBeVisible();

    await expectAccessibleOverlay(page, {
      trigger: page.getByRole("button", { name: "Registrar movimiento" }),
      overlay: page.getByRole("dialog", { name: "Registrar movimiento" }),
    });
    await activateWithKeyboard(page, page.getByRole("button", { name: "Registrar movimiento" }));
    const movementDialog = page.getByRole("dialog", {
      name: "Registrar movimiento",
    });
    accessibilityViolations.push(
      ...(await collectSeriousAccessibilityViolations(
        page,
        "Hour movement dialog at Compact",
      )),
    );
    const selectAll = movementDialog.getByRole("checkbox", {
      name: "Seleccionar todos",
    });
    const exceptionTutor = movementDialog.getByRole("checkbox", {
      name: "Seleccionar a Hopper, Grace",
    });
    const selectedTutor = movementDialog.getByRole("checkbox", {
      name: "Seleccionar a Curie, Marie",
    });

    await setCheckboxWithKeyboard(page, exceptionTutor, false);
    await setCheckboxWithKeyboard(page, selectedTutor, false);
    await setCheckboxWithKeyboard(page, selectAll, true);
    await setCheckboxWithKeyboard(page, exceptionTutor, false);
    await setCheckboxWithKeyboard(page, selectedTutor, false);
    await expect(selectAll).not.toBeChecked();
    await expect(
      movementDialog.getByRole("checkbox", {
        name: "Seleccionar a Lovelace, Ada",
      }),
    ).toBeChecked();
    await expect(exceptionTutor).not.toBeChecked();
    await expect(selectedTutor).not.toBeChecked();

    await selectWithKeyboard(page, movementDialog.getByLabel("Categoría"), E2E_MEETING_CATEGORY_ID);
    await page.setViewportSize({ width: 390, height: 640 });
    await movementDialog.getByLabel("Nota").fill("E2E meeting credit");
    await expect(movementDialog.getByRole("heading", { name: "Registrar movimiento" })).toBeInViewport();
    await page.route("**/api/admin/hours/movements", (route) => route.fulfill({
      status: 409, json: { error: "inactive_category" },
    }));
    await movementDialog.getByRole("button", { name: "Registrar movimientos" }).click();
    await expect(movementDialog.getByRole("alert")).toContainText("No se registró ningún movimiento.");
    await expect(movementDialog.getByRole("alert")).toBeInViewport();
    await expect(movementDialog.getByRole("heading", { name: "Registrar movimiento" })).toBeInViewport();
    await expect(movementDialog.getByRole("button", { name: "Registrar movimientos" })).toBeInViewport();
    await expect(movementDialog.getByLabel("Nota")).toHaveValue("E2E meeting credit");
    await page.unroute("**/api/admin/hours/movements");
    await page.setViewportSize({ width: 390, height: 844 });
    await activateWithKeyboard(
      page,
      movementDialog.getByRole("button", { name: "Registrar movimientos" }),
    );

    await expect(
      page.getByRole("status").filter({ hasText: "Origen: Reunión" }),
    ).toContainText("Origen: Reunión");
    await expect(
      page.getByRole("list", { name: "Saldos de horas" }).getByRole("listitem").filter({ hasText: "Lovelace, Ada" }),
    ).toContainText("2 h");

    await page.setViewportSize({ width: 820, height: 900 });
    await expect(
      page.getByRole("table", { name: "Saldos de horas" }).getByRole("row").filter({ hasText: "Lovelace, Ada" }),
    ).toContainText("2 h");

    await page.setViewportSize({ width: 1280, height: 900 });
    const primaryBalance = page.getByRole("table", { name: "Saldos de horas" }).getByRole("row").filter({ hasText: "Lovelace, Ada" });
    await expect(primaryBalance).toContainText("2 h");
    await expectAccessibleOverlay(page, {
      trigger: primaryBalance.getByRole("button", { name: "Ver movimientos de Lovelace, Ada" }),
      overlay: page.getByRole("dialog", { name: "Lovelace, Ada" }),
    });
    await activateWithKeyboard(
      page,
      primaryBalance.getByRole("button", { name: "Ver movimientos de Lovelace, Ada" }),
    );

    const contextualHistory = page.getByRole("dialog", {
      name: "Lovelace, Ada",
    });
    await expect(contextualHistory.getByText("E2E meeting credit")).toBeVisible();
    await expect(
      contextualHistory.getByText("Seeded meeting movement."),
    ).toBeVisible();
    await activateWithKeyboard(
      page,
      contextualHistory.getByRole("link", { name: "Ver movimientos de Lovelace, Ada" }),
    );

    await expect(page).toHaveURL(
      new RegExp(
        `/admin/hours/movements\\?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_PRIMARY_TUTOR_ID}`,
      ),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Movimientos" }),
    ).toBeVisible();
    await waitForHydration(page);
    await expect(page.getByLabel("Tutor", { exact: true })).toHaveValue(
      E2E_PRIMARY_TUTOR_ID,
    );

    const reversalButton = page.getByRole("button", {
      name: "Revertir movimiento de Lovelace, Ada del 01/01/2027",
    });
    const originalRow = reversalButton.locator("xpath=ancestor::tr");
    const originalMovementId = await originalRow.getAttribute("data-movement-id");
    expect(originalMovementId).not.toBeNull();
    await expect(originalRow).toHaveAttribute("data-reversal-state", "CONFIRMED");
    await expectAccessibleOverlay(page, {
      trigger: reversalButton,
      overlay: page.getByRole("alertdialog", { name: "Revertir movimiento" }),
    });
    await activateWithKeyboard(page, reversalButton);

    const reversalDialog = page.getByRole("alertdialog", {
      name: "Revertir movimiento",
    });
    await expect(
      reversalDialog.getByText(/el original permanecerá visible como revertido/i),
    ).toBeVisible();
    await page.route("**/api/admin/hours/movements/*/reverse", (route) => route.fulfill({
      status: 500, json: { error: "internal_server_error" },
    }));
    await reversalDialog.getByRole("button", { name: "Confirmar reversión" }).click();
    await expect(reversalDialog.getByRole("alert")).toContainText("No se pudo completar la operación. Intentar nuevamente.");
    await expect(reversalDialog.getByText("Lovelace, Ada", { exact: true })).toBeVisible();
    await page.unroute("**/api/admin/hours/movements/*/reverse");
    await activateWithKeyboard(
      page,
      reversalDialog.getByRole("button", { name: "Confirmar reversión" }),
    );

    await expect(
      page.getByRole("status").filter({ hasText: "Reversión registrada" }),
    ).toBeVisible();
    const reversedRow = page.locator(
      `tr[data-movement-id="${originalMovementId}"]`,
    );
    await expect(reversedRow).toHaveAttribute("data-reversal-state", "REVERSED");
    await expect(reversedRow.getByText("+1 h 30 min")).toBeVisible();
    await expect(
      reversedRow.getByRole("link", { name: "Ver reversión vinculada" }),
    ).toBeVisible();

    const reversalRow = page
      .locator('tr[data-reversal-state="REVERSAL"]')
      .filter({ hasText: "Lovelace, Ada" });
    await expect(reversalRow).toHaveCount(1);
    await expect(reversalRow.getByText("−1 h 30 min")).toBeVisible();
    await expect(
      reversalRow.getByRole("link", { name: "Ver movimiento original" }),
    ).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const history = page.getByRole(width === 390 ? "list" : "table", { name: "Historial de movimientos" });
      const original = history.locator(`[data-movement-id="${originalMovementId}"]`);
      const link = original.getByRole("link", { name: "Ver reversión vinculada" });
      await expect(link).toBeVisible();
      const target = await link.getAttribute("href");
      await expect(history.locator(`[id="${target!.slice(1)}"]`)).toContainText("−1 h 30 min");
      await expect(original).toContainText("+1 h 30 min");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expectAccessibleOverlay(page, {
      trigger: page.getByRole("button", { name: /^Filtros/ }),
      overlay: page.getByRole("dialog", { name: "Filtros" }),
    });
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });
});
