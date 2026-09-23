import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CAREER_ID,
  E2E_CONSULTATION_CONTACT,
  E2E_PRIMARY_TUTOR_ID,
  E2E_TUTOR_SESSION_TOKEN,
} from "./e2e-test-data";
import {
  activateWithKeyboard,
  expectReducedMotion,
  selectWithKeyboard,
  setCheckboxWithKeyboard,
} from "./keyboard-helpers";

test.describe("authenticated Admin consultation workflow", () => {
  test("imports, reviews, filters, preserves canonical data, and protects student contact", async ({
    context,
    page,
  }) => {
    test.setTimeout(120_000);

    const unauthenticatedList = await page.request.get("/api/admin/consultations");
    expect(unauthenticatedList.status()).toBe(401);
    expect(await unauthenticatedList.text()).not.toContain(E2E_CONSULTATION_CONTACT);
    expect(
      (
        await page.request.post("/api/admin/consultations/import", {
          data: { maxRows: 1000 },
        })
      ).status(),
    ).toBe(401);

    const signedAdminToken = `${E2E_ADMIN_SESSION_TOKEN}.${await makeSignature(
      E2E_ADMIN_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: signedAdminToken,
        url: "http://localhost:3000",
      },
    ]);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/admin/consultations");
    await expect(
      page.getByRole("heading", { level: 1, name: "Consultas" }),
    ).toBeVisible();

    await activateWithKeyboard(page, page.getByRole("button", { name: "Actualizar consultas" }));
    await expect(page.getByRole("status").filter({ hasText: "3 nuevas" })).toContainText(
      "3 nuevas",
    );
    await expect(page.getByRole("status").filter({ hasText: "3 ya procesadas" })).toHaveCount(0);

    const initialWorkspaceResponse = await page.request.get(
      "/api/admin/consultations",
    );
    expect(initialWorkspaceResponse.status()).toBe(200);
    const initialWorkspace = await initialWorkspaceResponse.json();
    expect(initialWorkspace.rows).toHaveLength(0);
    expect(initialWorkspace.reviewQueue).toHaveLength(3);
    const pendingStagingId = initialWorkspace.reviewQueue.find(
      (item: { studentFirstName: string }) => item.studentFirstName === "Riley",
    )?.stagingId;
    expect(pendingStagingId).toEqual(expect.any(String));
    expect(JSON.stringify(initialWorkspace)).not.toContain(E2E_CONSULTATION_CONTACT);

    await selectWithKeyboard(page, page.getByRole("combobox", { name: "Estado" }), "PENDING_REVIEW");
    await selectWithKeyboard(page, page.getByRole("combobox", { name: "Carrera" }), E2E_CAREER_ID);
    await page.getByRole("searchbox", { name: "Buscar consultas" }).fill("Casey");
    await expect(page).toHaveURL(/status=PENDING_REVIEW/);
    await expect(page).toHaveURL(/careerId=/);
    await expect(page).toHaveURL(/search=Casey/);
    await expect(
      page.getByRole("button", { name: "Revisar a Casey Duplicate" }),
    ).toHaveCount(2);

    const firstReviewButton = page
      .getByRole("button", { name: "Revisar a Casey Duplicate" })
      .first();
    await activateWithKeyboard(page, firstReviewButton);
    const firstReview = page.getByRole("dialog", {
      name: "Detalle de Casey Duplicate",
    });
    await expect(firstReview).toBeVisible();
    await expectReducedMotion(firstReview);
    await expect(firstReview.getByText("Valores originales y normalizados")).toBeVisible();
    await expect(firstReview.getByText("La consulta podría estar repetida.")).toBeVisible();
    await setCheckboxWithKeyboard(
      page,
      firstReview.getByRole("checkbox", { name: "Confirmo que revisé esta observación" }),
      true,
    );
    await selectWithKeyboard(
      page,
      firstReview.getByLabel("Decisión para el posible duplicado de Casey Duplicate"),
      "NOT_DUPLICATE",
    );
    await selectWithKeyboard(
      page,
      firstReview.getByRole("combobox", { name: "Clasificación" }),
      "SUBJECT",
    );
    await selectWithKeyboard(
      page,
      firstReview.getByRole("combobox", { name: "Materia" }),
      { label: "Algorithms" },
    );
    await activateWithKeyboard(page, firstReview.getByRole("button", { name: "Guardar revisión" }));
    await expect(firstReview.getByText("La consulta quedó consolidada.")).toBeVisible();
    await expectReducedMotion(firstReview);
    await activateWithKeyboard(
      page,
      firstReview.getByRole("button", { name: "Cerrar", exact: true }),
    );

    const secondReviewButton = page.getByRole("button", {
      name: "Revisar a Casey Duplicate",
    });
    await expect(secondReviewButton).toBeVisible();
    await activateWithKeyboard(page, secondReviewButton);
    const secondReview = page.getByRole("dialog", {
      name: "Detalle de Casey Duplicate",
    });
    await expect(secondReview).toBeVisible();
    const secondDuplicateDecision = secondReview.getByLabel(
      "Decisión para el posible duplicado de Casey Duplicate",
    );
    await expect(secondDuplicateDecision).toHaveValue("NOT_DUPLICATE");
    const secondAcknowledgement = secondReview.getByRole("checkbox", {
      name: "Confirmo que revisé esta observación",
    });
    if (await secondAcknowledgement.count()) {
      await setCheckboxWithKeyboard(page, secondAcknowledgement, true);
    }
    await selectWithKeyboard(
      page,
      secondReview.getByRole("combobox", { name: "Clasificación" }),
      "GENERAL",
    );
    await activateWithKeyboard(page, secondReview.getByRole("button", { name: "Guardar revisión" }));
    await expect(secondReview.getByText("La consulta quedó consolidada.")).toBeVisible();
    await activateWithKeyboard(
      page,
      secondReview.getByRole("button", { name: "Cerrar", exact: true }),
    );

    await expect(page.locator('[data-slot="consultations-screen"]')).toHaveAttribute(
      "data-state",
      "search-empty",
    );
    await selectWithKeyboard(page, page.getByRole("combobox", { name: "Estado" }), "ALL");
    await expect(page).toHaveURL(/careerId=/);
    await expect(page).toHaveURL(/search=Casey/);

    const canonicalResponse = await page.request.get("/api/admin/consultations");
    expect(canonicalResponse.status()).toBe(200);
    const canonicalWorkspace = await canonicalResponse.json();
    expect(canonicalWorkspace.rows).toHaveLength(2);
    expect(canonicalWorkspace.rows.map((row: { classification: string }) => row.classification))
      .toEqual(expect.arrayContaining(["SUBJECT", "GENERAL"]));
    expect(
      canonicalWorkspace.rows.find(
        (row: { classification: string }) => row.classification === "SUBJECT",
      )?.subject,
    ).toBe("Algorithms");
    expect(
      canonicalWorkspace.rows.some(
        (row: { studentFirstName: string }) => row.studentFirstName === "Riley",
      ),
    ).toBe(false);
    expect(
      canonicalWorkspace.reviewQueue.some(
        (item: { studentFirstName: string; classification: string }) =>
          item.studentFirstName === "Riley" &&
          item.classification === "PENDING_CLASSIFICATION",
      ),
    ).toBe(true);
    expect(JSON.stringify(canonicalWorkspace.rows)).toContain(E2E_CONSULTATION_CONTACT);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole("heading", { level: 1, name: "Consultas" })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (viewport.width < 768) {
        await expect(page.locator('ul[aria-label="Consultas registradas"]')).toBeVisible();
        await expect(page.locator("table")).toBeHidden();
      } else {
        await expect(page.locator("table")).toBeVisible();
      }
      if (viewport.width >= 1280) {
        await expect(page.getByRole("columnheader", { name: "Carrera" })).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Contacto de Casey Duplicate" }).first(),
        ).toHaveAttribute("href", `mailto:${encodeURIComponent(E2E_CONSULTATION_CONTACT)}`);
      }
    }

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.getByRole("searchbox", { name: "Buscar consultas" }).fill("");
    await expect(page).toHaveURL(/careerId=/);
    await expect(page).not.toHaveURL(/search=/);
    await expect(page.getByRole("button", { name: "Revisar a Riley Pending" })).toBeVisible();
    await activateWithKeyboard(page, page.getByRole("button", { name: "Revisar a Riley Pending" }));
    const pendingReview = page.getByRole("dialog", {
      name: "Detalle de Riley Pending",
    });
    await expect(pendingReview).toBeVisible();
    await expect(pendingReview.getByRole("combobox", { name: "Clasificación" })).toHaveValue(
      "PENDING_CLASSIFICATION",
    );
    await activateWithKeyboard(
      page,
      pendingReview.getByRole("button", { name: "Cerrar", exact: true }),
    );

    await activateWithKeyboard(page, page.getByRole("button", { name: "Actualizar consultas" }));
    await expect(page.getByRole("status").filter({ hasText: "3 ya procesadas" })).toContainText(
      "0 nuevas",
    );
    await expect(page).toHaveURL(/careerId=/);
    await expect(page).not.toHaveURL(/search=/);

    const partialStatus = page.locator('[aria-label="Estado de la fuente de consultas"]');
    await activateWithKeyboard(page, page.getByRole("button", { name: "Actualizar consultas" }));
    await expect(partialStatus).toHaveAttribute("data-state", "degraded");
    await expect(page.getByRole("status").filter({ hasText: "1 con errores" })).toBeVisible();
    await expect(page.getByText("Casey Duplicate").first()).toBeVisible();

    await activateWithKeyboard(page, page.getByRole("button", { name: "Actualizar consultas" }));
    await expect(
      page.getByRole("alert").filter({ hasText: "No se pudo acceder a la fuente de consultas." }),
    ).toBeVisible();
    await expect(partialStatus).toHaveAttribute("data-state", "unavailable");
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contacto de Casey Duplicate" }).first())
      .toBeVisible();
    await expect(page).toHaveURL(/careerId=/);
    await expect(page).not.toHaveURL(/search=/);

    await page.goto(
      "/admin/reports?fromDate=2027-01-15&toDate=2027-01-17",
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Reportes" }),
    ).toBeVisible();
    await expect(page.getByLabel("Desde")).toHaveValue("2027-01-15");
    await expect(page.getByLabel("Hasta")).toHaveValue("2027-01-17");
    await expect(page.getByText("Consultas consolidadas en el período")).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();

    await selectWithKeyboard(page, page.getByRole("combobox", { name: "Carrera" }), E2E_CAREER_ID);
    await selectWithKeyboard(
      page,
      page.getByRole("combobox", { name: "Materia" }),
      "33333333-3333-4333-8333-333333333333",
    );
    await selectWithKeyboard(page, page.getByRole("combobox", { name: "Tutor" }), E2E_PRIMARY_TUTOR_ID);
    await selectWithKeyboard(page, page.getByRole("combobox", { name: "Modalidad" }), "Remote");
    await activateWithKeyboard(page, page.getByRole("button", { name: "Aplicar filtros" }));
    await expect(page).toHaveURL(/careerId=/);
    await expect(page).toHaveURL(/subjectId=/);
    await expect(page).toHaveURL(/tutorId=/);
    await expect(page).toHaveURL(/modality=Remote/);
    const reportFilters = page.locator('form[action="/admin/reports"]');
    await expect(reportFilters.getByLabel("Materia")).toHaveValue(
      "33333333-3333-4333-8333-333333333333",
    );
    await page.reload();
    await expect(reportFilters.getByLabel("Modalidad")).toHaveValue("Remote");

    const rankedTable = page.getByRole("region", { name: "Carrera" });
    await rankedTable.focus();
    await expect(rankedTable).toBeFocused();
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(
        page.getByRole("heading", { level: 1, name: "Reportes" }),
      ).toBeVisible();
      const pageWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(pageWidth, `Reportes overflows at ${viewport.width}px`).toBeLessThanOrEqual(
        viewport.width,
      );
    }

    await page.goto(
      "/admin/reports?fromDate=2026-01-01&toDate=2026-01-01",
    );
    await expect(
      page.getByRole("heading", {
        level: 3,
        name: "No hay datos para los filtros seleccionados.",
      }),
    ).toBeVisible();
    await activateWithKeyboard(page, page.getByRole("link", { name: "Restablecer filtros" }));
    await expect(page).toHaveURL("http://localhost:3000/admin/reports");

    await page.goto(
      "/admin/reports?fromDate=2027-01-15&toDate=2027-01-17",
    );
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(E2E_CONSULTATION_CONTACT);
    await expect(page.locator("body")).not.toContainText("Casey");

    await page.goto("/admin");
    await expect(page.locator('[data-slot="admin-overview-screen"]')).toHaveAttribute(
      "data-state",
      "degraded",
    );
    await expect(page.getByRole("link", { name: /Revisar consultas/i })).toHaveAttribute(
      "href",
      "/admin/consultations",
    );
    await expect(page.getByRole("heading", { level: 2, name: "Hoy" })).toBeVisible();

    const signedTutorToken = `${E2E_TUTOR_SESSION_TOKEN}.${await makeSignature(
      E2E_TUTOR_SESSION_TOKEN,
      E2E_AUTH_SECRET,
    )}`;
    await context.clearCookies();
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: signedTutorToken,
        url: "http://localhost:3000",
      },
    ]);

    const tutorConsultationList = await page.request.get(
      "/api/admin/consultations",
    );
    expect(tutorConsultationList.status()).toBe(403);
    expect(await tutorConsultationList.text()).not.toContain(E2E_CONSULTATION_CONTACT);
    expect(
      (
        await page.request.post("/api/admin/consultations/import", {
          data: { maxRows: 1000 },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.patch(
          `/api/admin/consultations/review/${pendingStagingId}`,
          { data: { expectedVersion: 1 } },
        )
      ).status(),
    ).toBe(403);

    await page.goto("/admin/consultations");
    await expect(page).toHaveURL(/\/forbidden$/);
    for (const route of ["/tutor", "/tutor/schedule", "/tutor/hours"]) {
      await page.goto(route);
      await expect(page.locator("body")).not.toContainText(E2E_CONSULTATION_CONTACT);
    }

    await context.clearCookies();
    await page.goto("/login");
    await expect(page.locator("body")).not.toContainText(E2E_CONSULTATION_CONTACT);
    await expect(page.locator("body")).not.toContainText("Casey Duplicate");
    expect((await page.request.get("/api/admin/consultations")).status()).toBe(401);
  });
});
