import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_MEETING_CATEGORY_ID,
  E2E_PRIMARY_TUTOR_ID,
} from "./e2e-test-data";
import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";
import {
  activateWithKeyboard,
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

    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: signedSessionToken,
        url: "http://localhost:3000",
      },
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/hours");
    await expect(
      page.getByRole("heading", { level: 1, name: "Horas" }),
    ).toBeVisible();
    await expect(
      page.locator(`article#balance-${E2E_PRIMARY_TUTOR_ID}`),
    ).toBeVisible();

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
    const attendanceTutor = movementDialog.getByRole("checkbox", {
      name: "Seleccionar a Curie, Marie",
    });

    await setCheckboxWithKeyboard(page, exceptionTutor, false);
    await setCheckboxWithKeyboard(page, attendanceTutor, false);
    await setCheckboxWithKeyboard(page, selectAll, true);
    await setCheckboxWithKeyboard(page, exceptionTutor, false);
    await setCheckboxWithKeyboard(page, attendanceTutor, false);
    await expect(selectAll).not.toBeChecked();
    await expect(
      movementDialog.getByRole("checkbox", {
        name: "Seleccionar a Lovelace, Ada",
      }),
    ).toBeChecked();
    await expect(exceptionTutor).not.toBeChecked();
    await expect(attendanceTutor).not.toBeChecked();

    await selectWithKeyboard(page, movementDialog.getByLabel("Categoría"), E2E_MEETING_CATEGORY_ID);
    await movementDialog.getByLabel("Nota").fill("E2E meeting credit");
    await activateWithKeyboard(
      page,
      movementDialog.getByRole("button", { name: "Registrar movimientos" }),
    );

    await expect(
      page.getByRole("status").filter({ hasText: "Origen: Reunión" }),
    ).toContainText("Origen: Reunión");
    await expect(
      page.locator(`article#balance-${E2E_PRIMARY_TUTOR_ID}`),
    ).toContainText("+02:00");

    await page.setViewportSize({ width: 820, height: 900 });
    await expect(
      page.locator(
        `div.hidden.md\\:block.lg\\:hidden tr#balance-${E2E_PRIMARY_TUTOR_ID}`,
      ),
    ).toContainText("+02:00");

    await page.setViewportSize({ width: 1280, height: 900 });
    const primaryBalance = page.locator(
      `div.hidden.lg\\:block tr#balance-${E2E_PRIMARY_TUTOR_ID}`,
    );
    await expect(primaryBalance).toContainText("+02:00");
    await activateWithKeyboard(
      page,
      primaryBalance.getByRole("button", { name: "Ver movimientos" }),
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
      contextualHistory.getByRole("link", { name: "Ver historial completo" }),
    );

    await expect(page).toHaveURL(
      new RegExp(
        `/admin/hours/movements\\?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_PRIMARY_TUTOR_ID}`,
      ),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Movimientos" }),
    ).toBeVisible();
    await expect(page.getByLabel("Tutor", { exact: true })).toHaveValue(
      E2E_PRIMARY_TUTOR_ID,
    );

    const reversalButton = page.getByRole("button", {
      name: "Revertir movimiento de Lovelace, Ada del 01/01/2027",
    });
    const originalRow = reversalButton.locator("xpath=ancestor::li");
    const originalMovementId = await originalRow.getAttribute("data-movement-id");
    expect(originalMovementId).not.toBeNull();
    await expect(originalRow).toHaveAttribute("data-reversal-state", "CONFIRMED");
    await activateWithKeyboard(page, reversalButton);

    const reversalDialog = page.getByRole("dialog", {
      name: "Revertir movimiento",
    });
    await expect(
      reversalDialog.getByText(/el original permanecerá visible como revertido/i),
    ).toBeVisible();
    await activateWithKeyboard(
      page,
      reversalDialog.getByRole("button", { name: "Confirmar reversión" }),
    );

    await expect(
      page.getByRole("status").filter({ hasText: "Reversión registrada" }),
    ).toBeVisible();
    const reversedRow = page.locator(
      `li[data-movement-id="${originalMovementId}"]`,
    );
    await expect(reversedRow).toHaveAttribute("data-reversal-state", "REVERSED");
    await expect(reversedRow.getByText("+01:30")).toBeVisible();
    await expect(
      reversedRow.getByRole("link", { name: "Ver reversión vinculada" }),
    ).toBeVisible();

    const reversalRow = page
      .locator('li[data-reversal-state="REVERSAL"]')
      .filter({ hasText: "Lovelace, Ada" });
    await expect(reversalRow).toHaveCount(1);
    await expect(reversalRow.getByText("-01:30")).toBeVisible();
    await expect(
      reversalRow.getByRole("link", { name: "Ver movimiento original" }),
    ).toBeVisible();
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });
});
