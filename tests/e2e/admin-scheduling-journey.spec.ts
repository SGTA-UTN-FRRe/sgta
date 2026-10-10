import type { BrowserContext } from "@playwright/test";
import { expect, test } from "./fixtures";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
} from "./e2e-test-data";
import { activateWithKeyboard, expectAccessibleOverlay, focusWithKeyboard, selectWithKeyboard } from "./keyboard-helpers";
import { addE2ESessionCookie } from "./session-cookie";

const scheduleDate = "2027-01-18";

async function signInAdmin(context: BrowserContext) {
  const signedSessionToken = `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(
    E2E_ADMIN_SESSION_TOKEN,
    E2E_AUTH_SECRET,
  )}`;

  await addE2ESessionCookie(context, signedSessionToken);
}

test.describe("authenticated Admin schedule planning", () => {
  test("switches plans and edits a schedule assignment", async ({
    context,
    page,
  }) => {
    await signInAdmin(context);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      `/admin/schedules?cycleId=${E2E_CYCLE_ID}&date=${scheduleDate}`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Horarios" }),
    ).toBeVisible();

    await expectAccessibleOverlay(page, {
      trigger: page.getByRole("button", { name: "Nuevo plan", exact: true }),
      overlay: page.getByRole("dialog", { name: "Crear plan de horario" }),
    });

    const planSelector = page.getByRole("group", { name: "Planes de horario" });
    const specialPlan = planSelector.getByRole("button", {
      name: /Special week 2027/,
    });
    await expect(specialPlan).toHaveAttribute("aria-pressed", "true");

    await activateWithKeyboard(
      page,
      planSelector.getByRole("button", { name: /Regular 2027/ }),
    );
    await expect(
      planSelector.getByRole("button", { name: /Regular 2027/ }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 15_000 });

    await activateWithKeyboard(page, specialPlan);
    await expect(specialPlan).toHaveAttribute("aria-pressed", "true", {
      timeout: 15_000,
    });

    await activateWithKeyboard(
      page,
      page
        .getByRole("table", { name: "Matriz semanal" })
        .getByRole("button", {
          name: "Curie, Marie, Computer Science, lunes, 10:00 a 12:00",
        })
        .first(),
    );
    const assignmentDialog = page.getByRole("dialog", {
      name: "Editar asignación",
    });
    await selectWithKeyboard(
      page,
      assignmentDialog.getByLabel("Modalidad"),
      "VIRTUAL",
    );
    await activateWithKeyboard(
      page,
      assignmentDialog.getByRole("button", { name: "Guardar asignación" }),
    );
    await expect(
      page
        .getByRole("region", { name: "Notificaciones" })
        .getByText("Cambios guardados"),
    ).toBeVisible();
    await expect(assignmentDialog).not.toBeVisible();
  });

  test("keeps Compact assignment keyboard focus above the action footer", async ({ context, page }) => {
    await signInAdmin(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/admin/schedules?cycleId=${E2E_CYCLE_ID}&date=${scheduleDate}`);
    await activateWithKeyboard(page, page.getByRole("button", { name: "Agregar asignación", exact: true }));
    const editor = page.getByRole("dialog", { name: "Nueva asignación" });
    const modality = editor.getByLabel("Modalidad");
    await focusWithKeyboard(page, modality);
    const unobscured = await modality.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return hit !== null && element.contains(hit);
    });
    expect(unobscured).toBe(true);
  });
});
