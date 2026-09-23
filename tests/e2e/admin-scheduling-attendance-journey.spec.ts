import { expect, test, type BrowserContext } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ABSENCE_DEBIT_CATEGORY_ID,
  E2E_ABSENCE_OCCURRENCE_ID,
  E2E_ADMIN_SESSION_TOKEN,
  E2E_ATTENDANCE_TUTOR_ID,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_PRESENT_OCCURRENCE_ID,
  E2E_RECOVERY_CATEGORY_ID,
  E2E_RECOVERY_OCCURRENCE_ID,
} from "./e2e-test-data";
import {
  activateWithKeyboard,
  selectWithKeyboard,
} from "./keyboard-helpers";

const attendanceDate = "2027-01-18";
const attendanceUrl = `/admin/schedules/attendance?cycleId=${E2E_CYCLE_ID}&date=${attendanceDate}`;

async function signInAdmin(context: BrowserContext) {
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
}

test.describe("authenticated Admin scheduling and attendance", () => {
  test("edits the live schedule and completes the attendance ledger journey", async ({
    context,
    page,
  }) => {
    await signInAdmin(context);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/admin/schedules?cycleId=${E2E_CYCLE_ID}&date=${attendanceDate}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Horarios" }),
    ).toBeVisible();
    const planSelector = page.getByRole("group", { name: "Planes de horario" });
    await expect(planSelector.getByRole("button", { name: /Attendance special 2027/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await activateWithKeyboard(page, planSelector.getByRole("button", { name: /Regular 2027/ }));
    await expect(planSelector.getByRole("button", { name: /Regular 2027/ })).toHaveAttribute(
      "aria-pressed",
      "true",
      { timeout: 15_000 },
    );
    await activateWithKeyboard(
      page,
      planSelector.getByRole("button", { name: /Attendance special 2027/ }),
    );
    await expect(
      planSelector.getByRole("button", { name: /Attendance special 2027/ }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });

    await activateWithKeyboard(
      page,
      page.getByLabel("Grilla semanal").getByRole("button", {
        name: "Curie, Marie, LUN, 10:00 a 12:00",
      }),
    );
    const assignmentDialog = page.getByRole("dialog", { name: "Editar asignación" });
    await assignmentDialog.getByLabel("Modalidad").fill("Attendance room updated");
    await activateWithKeyboard(
      page,
      assignmentDialog.getByRole("button", { name: "Guardar asignación" }),
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Cambios guardados" }),
    ).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Editar asignación" })).not.toBeVisible();

    await page.goto("/admin/hours");
    const initialBalance = page.locator(
      `div.hidden.lg\\:block tr#balance-${E2E_ATTENDANCE_TUTOR_ID}`,
    );
    await expect(initialBalance).toContainText("+00:00");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(attendanceUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Asistencia" }),
    ).toBeVisible();

    const presentRow = page.locator(
      `[data-attendance-occurrence-id="${E2E_PRESENT_OCCURRENCE_ID}"]`,
    );
    await activateWithKeyboard(
      page,
      presentRow.getByRole("button", { name: /Presente para Curie, Marie/ }),
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Cambios guardados" }),
    ).toContainText("Presente");
    await expect(presentRow).toContainText("Presente");

    await page.goto("/admin/hours");
    await expect(
      page.locator(`article#balance-${E2E_ATTENDANCE_TUTOR_ID}`),
    ).toContainText("+00:00");

    await page.goto(attendanceUrl);
    const absenceRow = page.locator(
      `[data-attendance-occurrence-id="${E2E_ABSENCE_OCCURRENCE_ID}"]`,
    );
    await activateWithKeyboard(
      page,
      absenceRow.getByRole("button", { name: /Falta para Curie, Marie/ }),
    );
    const debitDialog = page.getByRole("dialog", {
      name: "Confirmar débito por inasistencia",
    });
    await expect(debitDialog).toContainText("Duración propuesta: 2 h 00 min");
    await activateWithKeyboard(page, debitDialog.getByRole("button", { name: "Cancelar" }));
    await activateWithKeyboard(
      page,
      absenceRow.getByRole("button", {
        name: /Cancelar débito por inasistencia para Curie, Marie/,
      }),
    );
    await expect(absenceRow).toContainText("Falta registrada sin débito");
    await expect(absenceRow).toContainText("Sin débito");

    await page.reload();
    const reloadedAbsenceRow = page.locator(
      `[data-attendance-occurrence-id="${E2E_ABSENCE_OCCURRENCE_ID}"]`,
    );
    await expect(reloadedAbsenceRow).toContainText("Falta");
    await expect(reloadedAbsenceRow).toContainText("Sin débito");

    await activateWithKeyboard(
      page,
      reloadedAbsenceRow.getByRole("button", {
        name: /Confirmar débito por inasistencia para Curie, Marie/,
      }),
    );
    const confirmationDialog = page.getByRole("dialog", {
      name: "Confirmar débito por inasistencia",
    });
    await selectWithKeyboard(
      page,
      confirmationDialog.getByLabel("Categoría de horas"),
      E2E_ABSENCE_DEBIT_CATEGORY_ID,
    );
    await confirmationDialog.getByLabel("Minutos a debitar").fill("90");
    await activateWithKeyboard(
      page,
      confirmationDialog.getByRole("button", { name: "Confirmar débito", exact: true }),
    );
    await expect(reloadedAbsenceRow).toContainText("Débito confirmado");
    await expect(reloadedAbsenceRow).toContainText(
      "Movimiento de débito vinculado por 1 h 30 min",
    );

    await page.goto(
      `/admin/hours/movements?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_ATTENDANCE_TUTOR_ID}`,
    );
    const debitMovement = page.locator("li[data-movement-id]").filter({
      hasText: "Absence debit",
    });
    await expect(debitMovement).toHaveCount(1);
    await expect(debitMovement).toContainText("Débito · 01:30");

    await page.goto(attendanceUrl);
    const recoveryRow = page.locator(
      `[data-attendance-occurrence-id="${E2E_RECOVERY_OCCURRENCE_ID}"]`,
    );
    await activateWithKeyboard(
      page,
      recoveryRow.getByRole("button", { name: /Reconocer recuperación de Curie, Marie/ }),
    );
    const recoveryDialog = page.getByRole("dialog", { name: "Reconocer recuperación" });
    await selectWithKeyboard(
      page,
      recoveryDialog.getByLabel("Categoría de recuperación"),
      E2E_RECOVERY_CATEGORY_ID,
    );
    await activateWithKeyboard(
      page,
      recoveryDialog.getByRole("button", { name: "Reconocer recuperación", exact: true }),
    );
    await expect(recoveryRow).toContainText(/Recuperación reconocida/);

    await page.goto(
      `/admin/hours/movements?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_ATTENDANCE_TUTOR_ID}`,
    );
    const recoveryMovement = page.locator("li[data-movement-id]").filter({
      hasText: "Scheduled recovery",
    });
    await expect(recoveryMovement).toHaveCount(1);
    await expect(recoveryMovement).toContainText("Crédito · 01:00 · Recuperación");
  });
});
