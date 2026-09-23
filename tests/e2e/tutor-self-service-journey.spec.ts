import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_AUTH_SECRET,
  E2E_SECONDARY_TUTOR_ID,
  E2E_TUTOR_SESSION_TOKEN,
} from "./e2e-test-data";

const viewports = [
  { height: 844, name: "Compact", width: 390 },
  { height: 900, name: "Medium", width: 900 },
  { height: 900, name: "Wide", width: 1440 },
] as const;

async function expectNoHorizontalOverflow(page: Page) {
  const pageWidth = await page.evaluate(() => ({
    document: document.documentElement.clientWidth,
    scroll: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
  }));

  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.document);
}

async function signInTutor(context: BrowserContext) {
  const signedSessionToken = `${E2E_TUTOR_SESSION_TOKEN}.${await makeSignature(
    E2E_TUTOR_SESSION_TOKEN,
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

test.describe("authenticated Tutor self-service", () => {
  test("proves owner-scoped reads, protected boundaries, and responsive views", async ({
    context,
    page,
  }) => {
    await signInTutor(context);

    const summaryResponse = await page.request.get("/api/tutor/summary");
    expect(summaryResponse.status()).toBe(200);
    const summary = await summaryResponse.json();
    expect(summary).toMatchObject({
      balance: { state: "current" },
      state: "ready",
      tutor: {
        displayName: "Ada",
        subjects: [{ name: "Algorithms" }],
      },
    });
    expect(summary.balance.signedBalanceMinutes).toBeGreaterThanOrEqual(30);
    expect(JSON.stringify(summary)).not.toContain("Grace");
    expect(JSON.stringify(summary)).not.toContain("Data Structures");
    expect(JSON.stringify(summary)).not.toContain("tutorId");
    expect(JSON.stringify(summary)).not.toMatch(/email|student/i);

    const scheduleResponse = await page.request.get(
      "/api/tutor/schedule?date=2027-01-18",
    );
    expect(scheduleResponse.status()).toBe(200);
    const schedule = await scheduleResponse.json();
    expect(schedule).toMatchObject({
      effectivePlan: { kind: "SPECIAL", name: "Attendance special 2027" },
      state: "ready",
    });
    expect(schedule.days).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assignments: [
            expect.objectContaining({
              endMinutes: 720,
              modality: "Tutor special room",
              startMinutes: 600,
            }),
          ],
          date: "2027-01-18",
        }),
      ]),
    );
    expect(JSON.stringify(schedule)).not.toContain(E2E_SECONDARY_TUTOR_ID);
    expect(JSON.stringify(schedule)).not.toContain("Secondary room");
    expect(JSON.stringify(schedule)).not.toMatch(/email|student/i);

    const hoursResponse = await page.request.get("/api/tutor/hours");
    expect(hoursResponse.status()).toBe(200);
    const hours = await hoursResponse.json();
    expect(hours).toMatchObject({
      balance: { state: "current" },
      historyComplete: true,
      state: "ready",
    });
    expect(hours.movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: "Seeded meeting movement.",
          signedDurationMinutes: 30,
        }),
      ]),
    );
    expect(JSON.stringify(hours)).not.toContain("Secondary tutor movement");
    expect(JSON.stringify(hours)).not.toContain("actorId");
    expect(JSON.stringify(hours)).not.toMatch(/email|student/i);

    expect((await page.request.get("/api/admin/tutors")).status()).toBe(403);
    expect(
      (
        await page.request.post("/api/admin/tutors", {
          data: { firstName: "Rejected", lastName: "Tutor" },
        })
      ).status(),
    ).toBe(403);

    await page.goto("/admin/tutors");
    await expect(page).toHaveURL(/\/forbidden$/);

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/tutor");
      await expect(
        page.getByRole("heading", { level: 1, name: "Mi resumen" }),
      ).toBeVisible();
      await expect(page.getByText("Algorithms", { exact: true })).toBeVisible();
      await expect(page.getByText(/\+\d{2}:\d{2}/).first()).toBeVisible();
      await expect(page.getByRole("link", { name: "Tutores", exact: true })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Configuración", exact: true })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /registrar|editar|revertir|asistencia/i }),
      ).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("Grace");
      await expect(page.locator("body")).not.toContainText("Data Structures");
      await expectNoHorizontalOverflow(page);
    }

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/tutor/schedule?date=2027-01-18");
      await expect(
        page.getByRole("heading", { level: 1, name: "Mi horario" }),
      ).toBeVisible();
      await expect(page.getByText("Plan Especial", { exact: true })).toBeVisible();
      await expect(page.getByText("10:00 a 12:00", { exact: true })).toBeVisible();
      await expect(page.getByText("Tutor special room", { exact: true })).toBeVisible();
      await expect(
        page.locator('[data-layout="schedule-day-list-week"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /editar|eliminar|asistencia|revertir/i }),
      ).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/tutor/hours");
      await expect(
        page.getByRole("heading", { level: 1, name: "Mis horas" }),
      ).toBeVisible();
      await expect(page.getByText("Al día", { exact: true })).toBeVisible();
      await expect(page.getByText("Seeded meeting movement.", { exact: true })).toBeVisible();
      await expect(
        page.locator('[data-layout="movement-history"]'),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /registrar|editar|revertir|eliminar/i }),
      ).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }
  });

  test("supports keyboard navigation and reduced motion across Tutor routes", async ({
    context,
    page,
  }) => {
    await signInTutor(context);
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/tutor");

    const trigger = page.getByRole("button", { name: "Abrir navegación" });
    await page.keyboard.press("Tab");
    await expect(trigger).toBeFocused();
    await expect
      .poll(() => trigger.evaluate((element) => getComputedStyle(element).boxShadow))
      .not.toBe("none");
    const skipLink = page.getByRole("link", {
      name: "Saltar al contenido principal",
    });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Navegación del tutor" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cerrar navegación" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("link", { name: "Mi horario" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { level: 1, name: "Mi horario" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Fecha de referencia")).toBeFocused();
    const queryButton = page.getByRole("button", { name: "Consultar" });
    for (let tabPresses = 0; tabPresses < 8; tabPresses += 1) {
      if (await queryButton.evaluate((element) => element === document.activeElement)) {
        break;
      }
      await page.keyboard.press("Tab");
    }
    await expect(queryButton).toBeFocused();
    await page.keyboard.press("Enter");
    const scheduleTitle = page.getByRole("heading", {
      level: 1,
      name: "Mi horario",
    });
    await expect(scheduleTitle).toBeFocused();
    await expect
      .poll(() => scheduleTitle.evaluate((element) => getComputedStyle(element).boxShadow))
      .not.toBe("none");

    await page.keyboard.press("Shift+Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("link", { name: "Mis horas" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Mis horas" }),
    ).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(
      dialog.getByRole("link", { name: "Mi resumen" }),
    ).toBeFocused();

    await page.emulateMedia({ reducedMotion: "reduce" });
    const summaryLink = dialog.getByRole("link", { name: "Mi resumen" });
    const transitionDurations = await summaryLink.evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(",")
        .map((duration) => Number.parseFloat(duration)),
    );
    expect(transitionDurations.every((duration) => duration <= 0.001)).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
