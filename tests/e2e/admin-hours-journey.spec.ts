import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_MEETING_CATEGORY_ID,
  E2E_PRIMARY_TUTOR_ID,
} from "./e2e-test-data";

test.describe("authenticated Admin hour operations", () => {
  test("registers selected meeting credit and reverses it from movement history", async ({
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

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/hours");
    await expect(
      page.getByRole("heading", { level: 1, name: "Horas" }),
    ).toBeVisible();
    await expect(
      page.locator(`article#balance-${E2E_PRIMARY_TUTOR_ID}`),
    ).toBeVisible();

    await page.getByRole("button", { name: "Registrar movimiento" }).click();
    const movementDialog = page.getByRole("dialog", {
      name: "Registrar movimiento",
    });
    const selectAll = movementDialog.getByRole("checkbox", {
      name: "Seleccionar todos",
    });
    const exceptionTutor = movementDialog.getByRole("checkbox", {
      name: "Seleccionar a Hopper, Grace",
    });
    const attendanceTutor = movementDialog.getByRole("checkbox", {
      name: "Seleccionar a Curie, Marie",
    });

    await exceptionTutor.uncheck();
    await attendanceTutor.uncheck();
    await selectAll.check();
    await exceptionTutor.uncheck();
    await attendanceTutor.uncheck();
    await expect(selectAll).not.toBeChecked();
    await expect(
      movementDialog.getByRole("checkbox", {
        name: "Seleccionar a Lovelace, Ada",
      }),
    ).toBeChecked();
    await expect(exceptionTutor).not.toBeChecked();
    await expect(attendanceTutor).not.toBeChecked();

    await movementDialog.getByLabel("Categoría").selectOption({
      value: E2E_MEETING_CATEGORY_ID,
    });
    await movementDialog.getByLabel("Nota").fill("E2E meeting credit");
    await movementDialog
      .getByRole("button", { name: "Registrar movimientos" })
      .click();

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
    await primaryBalance.getByRole("button", { name: "Ver movimientos" }).click();

    const contextualHistory = page.getByRole("dialog", {
      name: "Lovelace, Ada",
    });
    await expect(contextualHistory.getByText("E2E meeting credit")).toBeVisible();
    await expect(
      contextualHistory.getByText("Seeded meeting movement."),
    ).toBeVisible();
    await contextualHistory
      .getByRole("link", { name: "Ver historial completo" })
      .click();

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
    await reversalButton.click();

    const reversalDialog = page.getByRole("dialog", {
      name: "Revertir movimiento",
    });
    await expect(
      reversalDialog.getByText(/el original permanecerá visible como revertido/i),
    ).toBeVisible();
    await reversalDialog
      .getByRole("button", { name: "Confirmar reversión" })
      .click();

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
  });
});
