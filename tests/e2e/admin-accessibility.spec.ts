import { mkdir } from "node:fs/promises";
import { expect, test } from "./fixtures";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_PRIMARY_TUTOR_ID,
} from "./e2e-test-data";
import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";
import { addE2ESessionCookie } from "./session-cookie";
import {
  activateWithKeyboard,
  expectReducedMotion,
} from "./keyboard-helpers";

const adminRoutes = [
  { path: "/admin", title: "Inicio" },
  { path: "/admin/tutors", title: "Tutores", action: "Agregar tutor" },
  { path: "/admin/tutors/subjects", title: "Materias", action: "Actualizar" },
  {
    path: `/admin/schedules?cycleId=${E2E_CYCLE_ID}&date=2027-01-18`,
    title: "Horarios",
    action: "Nuevo plan",
  },
  { path: "/admin/hours", title: "Horas", action: "Registrar movimiento" },
  {
    path: `/admin/hours/movements?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_PRIMARY_TUTOR_ID}`,
    title: "Movimientos",
    action: "Volver a Horas",
  },
  { path: "/admin/consultations", title: "Consultas", action: "Actualizar consultas" },
  { path: "/admin/reports", title: "Reportes", action: "Aplicar filtros" },
  { path: "/admin/settings", title: "Configuración", action: "Cerrar ciclo" },
];

const viewports = [
  { width: 390, height: 844, name: "compact" },
  { width: 900, height: 1000, name: "medium" },
  { width: 1440, height: 1000, name: "wide" },
];

test.describe("Admin accessibility and responsive layouts", () => {
  test("keeps every Admin route usable at supported widths", async ({ context, page }) => {
    const accessibilityViolations: string[] = [];
    const signedSessionToken = `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(
      E2E_ADMIN_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;
    await addE2ESessionCookie(context, signedSessionToken);

    const captureLayouts = process.env.CAPTURE_ADMIN_LAYOUTS === "1";
    if (captureLayouts) {
      await mkdir("test-results/admin-layout-review", { recursive: true });
    }

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);

      for (const route of adminRoutes) {
        await page.goto(route.path);
        const pageTitle = page.getByRole("heading", { level: 1, name: route.title });
        await expect(pageTitle).toBeVisible();

        if (route.action !== undefined) {
          const action = page.getByRole("button", { name: route.action }).or(
            page.getByRole("link", { name: route.action }),
          );
          await expect(action.first()).toBeVisible();
        }

        if (route.title === "Horarios" && viewport.name === "compact") {
          await expect(
            page.getByRole("heading", { level: 2, name: "Editor por día" }),
          ).toBeVisible();
          const daySelector = page.getByRole("group", { name: "Días del plan" });
          await expect(daySelector).toBeVisible();
          const daySelectorBounds = await daySelector.boundingBox();
          expect(daySelectorBounds).not.toBeNull();
          expect(daySelectorBounds!.y + daySelectorBounds!.height).toBeLessThanOrEqual(
            viewport.height,
          );
        }

        if (route.title === "Horarios" && viewport.name === "wide") {
          const layout = await page
            .getByRole("group", { name: "Grilla semanal" })
            .evaluate((grid) => {
              const clippedTimes: string[] = [];
              const intersectingBlocks: string[] = [];
              let assignmentCount = 0;

              for (const column of grid.querySelectorAll<HTMLElement>(
                "[data-schedule-day-column]",
              )) {
                const blocks = Array.from(
                  column.querySelectorAll<HTMLElement>(
                    "[data-schedule-assignment-id]",
                  ),
                ).filter((block) => block.getClientRects().length > 0);
                assignmentCount += blocks.length;

                for (const block of blocks) {
                  const time = block.querySelector<HTMLElement>(
                    "[data-schedule-assignment-time]",
                  );

                  if (
                    time === null ||
                    time.scrollWidth > time.clientWidth ||
                    time.getBoundingClientRect().left <
                      block.getBoundingClientRect().left - 0.5 ||
                    time.getBoundingClientRect().right >
                      block.getBoundingClientRect().right + 0.5
                  ) {
                    clippedTimes.push(block.dataset.scheduleAssignmentId ?? "unknown");
                  }
                }

                for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
                  const left = blocks[leftIndex]!;
                  const leftBounds = left.getBoundingClientRect();

                  for (
                    let rightIndex = leftIndex + 1;
                    rightIndex < blocks.length;
                    rightIndex += 1
                  ) {
                    const right = blocks[rightIndex]!;
                    const rightBounds = right.getBoundingClientRect();
                    const intersects =
                      leftBounds.left < rightBounds.right &&
                      rightBounds.left < leftBounds.right &&
                      leftBounds.top < rightBounds.bottom &&
                      rightBounds.top < leftBounds.bottom;

                    if (intersects) {
                      intersectingBlocks.push(
                        `${left.dataset.scheduleAssignmentId}:${right.dataset.scheduleAssignmentId}`,
                      );
                    }
                  }
                }
              }

              return { assignmentCount, clippedTimes, intersectingBlocks };
            });

          expect(layout.assignmentCount).toBeGreaterThan(0);
          expect(layout.clippedTimes).toEqual([]);
          expect(layout.intersectingBlocks).toEqual([]);
        }

        const layoutWidth = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        if (captureLayouts) {
          const routeName = route.path.split("?")[0].replaceAll("/", "-").slice(1);
          await page.screenshot({
            path: `test-results/admin-layout-review/${viewport.name}-${routeName}.png`,
          });
        }

        const overflowDetails =
          layoutWidth.documentWidth > layoutWidth.viewportWidth
            ? await page.evaluate(() =>
                Array.from(document.querySelectorAll<HTMLElement>("body *"))
                  .map((element) => ({
                    className: typeof element.className === "string" ? element.className : "",
                    element: element.tagName.toLowerCase(),
                    id: element.id,
                    right: Math.round(element.getBoundingClientRect().right),
                    text: (element.innerText ?? "").slice(0, 60),
                  }))
                  .filter((element) => element.right > window.innerWidth)
                  .sort((first, second) => second.right - first.right)
                  .slice(0, 8),
              )
            : [];
        expect(
          layoutWidth.documentWidth,
          `${route.path} overflows at ${viewport.name} width ${viewport.width}px: ${JSON.stringify(overflowDetails)}`,
        ).toBeLessThanOrEqual(layoutWidth.viewportWidth);

        const pageHeaderAction = page.locator('[data-slot="page-header-action"]');
        if ((await pageHeaderAction.count()) > 0) {
          await expect(pageHeaderAction).toBeVisible();
          const actionBounds = await pageHeaderAction.boundingBox();
          expect(actionBounds, `${route.path} should show its primary header action`).not.toBeNull();
          expect(actionBounds!.x).toBeGreaterThanOrEqual(0);
          expect(actionBounds!.x + actionBounds!.width).toBeLessThanOrEqual(viewport.width);
        }

        accessibilityViolations.push(
          ...(await collectSeriousAccessibilityViolations(
            page,
            `${route.path} at ${viewport.name}`,
          )),
        );
      }
    }

    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });

  test("keyboard navigation opens the mobile Admin route and focuses its heading", async ({
    context,
    page,
  }) => {
    const signedSessionToken = `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(
      E2E_ADMIN_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;
    await addE2ESessionCookie(context, signedSessionToken);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/tutors");
    await activateWithKeyboard(page, page.getByRole("button", { name: "Abrir navegación" }));

    const navigation = page.getByRole("dialog", { name: "Navegación de administración" });
    await expectReducedMotion(navigation);
    const accessibilityViolations = await collectSeriousAccessibilityViolations(
      page,
      "Admin navigation drawer on Compact",
    );
    await activateWithKeyboard(page, navigation.getByRole("link", { name: "Horarios" }));
    await expect(page).toHaveURL(/\/admin\/schedules$/);
    const pageTitle = page.getByRole("heading", { level: 1, name: "Horarios" });
    await expect(pageTitle).toBeFocused();
    await expect
      .poll(() => pageTitle.evaluate((element) => getComputedStyle(element).boxShadow))
      .not.toBe("none");
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });
});
