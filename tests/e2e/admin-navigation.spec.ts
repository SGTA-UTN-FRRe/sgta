import { expect, test } from "./fixtures";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_PRIMARY_TUTOR_ID,
  E2E_SECONDARY_TUTOR_ID,
} from "./e2e-test-data";
import { activateWithKeyboard } from "./keyboard-helpers";
import { addE2ESessionCookie } from "./session-cookie";

for (const viewport of [
  { width: 390, height: 844, layout: "compact" },
  { width: 900, height: 1000, layout: "medium" },
  { width: 1440, height: 1000, layout: "wide" },
]) {
  test(`follows Admin home and related tutor links at ${viewport.layout}`, async ({ context, page }, testInfo) => {
    await addE2ESessionCookie(context, `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(E2E_ADMIN_SESSION_TOKEN, E2E_AUTH_SECRET)}`);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });

    async function navigate(label: string) {
      if (viewport.layout === "compact") {
        await activateWithKeyboard(page, page.getByRole("button", { name: "Abrir navegación" }));
      }
      const nav = page.getByRole("navigation", { name: "Navegación de administración" });
      await expect(nav.getByRole("link").first()).toHaveAccessibleName("Inicio");
      await activateWithKeyboard(page, nav.getByRole("link", { name: label, exact: true }));
    }

    await page.goto("/admin/tutors");
    const tutorName = () => page.getByRole(viewport.layout === "compact" ? "list" : "table", { name: "Lista de tutores" }).getByRole("button", { name: "Lovelace, Ada", exact: true });
    await activateWithKeyboard(page, tutorName());
    await expect(page.getByRole("dialog", { name: "Detalle de Lovelace, Ada" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("link", { name: /^Ver movimientos de / })).toBeVisible();
    await expect(page.getByText(/Cargando el detalle del tutor/)).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("tutor-detail.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(tutorName()).toBeFocused();

    await navigate("Inicio");
    await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
    const duties = page.getByRole(viewport.layout === "compact" ? "list" : "table", { name: "Guardias próximas" });
    await expect(duties).toBeVisible();
    await expect(duties.getByRole("link", { name: /^Ver horarios de / }).first())
      .toHaveAttribute("href", /\/admin\/schedules\?date=\d{4}-\d{2}-\d{2}$/);
    if (viewport.layout === "compact") {
      await activateWithKeyboard(page, page.getByRole("button", { name: "Abrir navegación" }));
    }
    await expect(page.getByRole("link", { name: "Inicio", exact: true })).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: testInfo.outputPath("home-navigation.png"), fullPage: true });
    if (viewport.layout === "compact") await page.keyboard.press("Escape");

    await navigate("Horas");
    await activateWithKeyboard(page, page.getByRole("link", { name: "Ver tutor Lovelace, Ada" }));
    await expect(page.getByRole("searchbox", { name: "Buscar tutor" })).toHaveValue("Lovelace, Ada");
    await expect(tutorName()).toBeVisible();
    await expect(page.getByRole("button", { name: "Curie, Marie", exact: true })).toHaveCount(0);
    await activateWithKeyboard(page, tutorName());
    await activateWithKeyboard(page, page.getByRole("dialog").getByRole("link", { name: /^Ver movimientos de / }));
    await expect(page).toHaveURL(new RegExp(`/admin/hours/movements\\?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_PRIMARY_TUTOR_ID}$`));
    await expect(page.getByRole("combobox", { name: "Tutor", exact: true })).toHaveValue(E2E_PRIMARY_TUTOR_ID);

    await navigate("Horas");
    await activateWithKeyboard(page, page.getByRole("link", { name: "Ver tutor Hopper, Grace" }));
    await expect(page.getByRole("searchbox", { name: "Buscar tutor" })).toHaveValue("Hopper, Grace");
    await expect(page.getByRole("button", { name: "Lovelace, Ada", exact: true })).toHaveCount(0);
    await activateWithKeyboard(page, page.getByRole(viewport.layout === "compact" ? "list" : "table", { name: "Lista de tutores" }).getByRole("button", { name: "Hopper, Grace", exact: true }));
    await activateWithKeyboard(page, page.getByRole("dialog").getByRole("link", { name: /^Ver movimientos de / }));
    await expect(page.getByRole("combobox", { name: "Tutor", exact: true })).toHaveValue(E2E_SECONDARY_TUTOR_ID);

    await page.goto(`/admin/reports?fromDate=2027-01-18&toDate=2027-01-18`);
    await activateWithKeyboard(page, page.getByRole("table", { name: "Guardias programadas por tutor" }).getByRole("link", { name: "Ver tutor Curie, Marie" }));
    await expect(page.getByRole("searchbox", { name: "Buscar tutor" })).toHaveValue("Curie, Marie");
    await expect(page.getByRole("button", { name: "Lovelace, Ada", exact: true })).toHaveCount(0);

  });
}
