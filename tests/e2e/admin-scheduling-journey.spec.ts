import { expect, test, type BrowserContext } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
} from "./e2e-test-data";
import { activateWithKeyboard } from "./keyboard-helpers";
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
      page.getByLabel("Grilla semanal").getByRole("button", {
        name: "Curie, Marie, LUN, 10:00 a 12:00",
      }),
    );
    const assignmentDialog = page.getByRole("dialog", {
      name: "Editar asignación",
    });
    await assignmentDialog
      .getByLabel("Modalidad")
      .fill("Schedule room updated");
    await activateWithKeyboard(
      page,
      assignmentDialog.getByRole("button", { name: "Guardar asignación" }),
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Cambios guardados" }),
    ).toBeVisible();
    await expect(assignmentDialog).not.toBeVisible();
  });
});
