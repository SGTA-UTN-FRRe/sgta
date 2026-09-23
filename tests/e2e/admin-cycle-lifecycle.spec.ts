import { expect, test } from "@playwright/test";
import { makeSignature } from "better-auth/crypto";

import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_AUTH_SECRET,
  E2E_CYCLE_ID,
  E2E_PRIMARY_TUTOR_ID,
} from "./e2e-test-data";

test("closes a cycle and opens a successor without transferring balance", async ({
  context,
  page,
}) => {
  test.setTimeout(120_000);

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

  const initialWorkspaceResponse = await page.request.get("/api/admin/hours");
  expect(initialWorkspaceResponse.status()).toBe(200);
  const initialWorkspace: {
    currentCycle: { id: string; name: string };
    balances: Array<{ tutor: { id: string }; signedBalanceMinutes: number }>;
  } = await initialWorkspaceResponse.json();
  expect(initialWorkspace.currentCycle.id).toBe(E2E_CYCLE_ID);
  const historicalBalance = initialWorkspace.balances.find(
    (balance) => balance.tutor.id === E2E_PRIMARY_TUTOR_ID,
  )?.signedBalanceMinutes;
  expect(historicalBalance).toBeGreaterThan(0);

  await page.goto("/admin/settings");
  await expect(page.getByRole("heading", { name: "Ciclo actual" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar ciclo", exact: true }).click();

  const closeConfirmation = page.getByRole("alertdialog", {
    name: "Confirmar cierre del ciclo",
  });
  await expect(closeConfirmation).toContainText(initialWorkspace.currentCycle.name);
  await expect(closeConfirmation).toContainText("El historial permanecerá disponible");
  await expect(closeConfirmation).toContainText("saldo de horas cero");
  await closeConfirmation
    .getByRole("button", { name: "Confirmar cierre", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "El ciclo se cerró correctamente" }),
  ).toBeVisible();

  await page.reload();
  const cycleHistory = page.getByRole("list", { name: "Ciclos registrados" });
  const closedCycleRow = cycleHistory
    .locator("li")
    .filter({ hasText: initialWorkspace.currentCycle.name });
  await expect(closedCycleRow).toContainText("Cerrado");

  const historicalMovementsResponse = await page.request.get(
    `/api/admin/hours/movements?cycleId=${E2E_CYCLE_ID}&tutorId=${E2E_PRIMARY_TUTOR_ID}&limit=200`,
  );
  expect(historicalMovementsResponse.status()).toBe(200);
  const historicalMovements: Array<{
    cycle: { id: string; status: string };
    signedDurationMinutes: number;
  }> = (await historicalMovementsResponse.json()).movements;
  expect(historicalMovements.length).toBeGreaterThan(0);
  expect(
    historicalMovements.every(
      (movement) =>
        movement.cycle.id === E2E_CYCLE_ID && movement.cycle.status === "CLOSED",
    ),
  ).toBe(true);
  expect(
    historicalMovements.reduce(
      (balance, movement) => balance + movement.signedDurationMinutes,
      0,
    ),
  ).toBe(historicalBalance);

  const cycleForm = page
    .getByRole("button", { name: "Crear ciclo", exact: true })
    .locator("xpath=ancestor::form");
  await cycleForm.getByLabel("Nombre", { exact: true }).fill("2028");
  await cycleForm
    .getByLabel("Fecha de inicio", { exact: true })
    .fill("2028-01-01");
  await cycleForm
    .getByLabel("Fecha de finalización", { exact: true })
    .fill("2028-12-31");
  await cycleForm.getByRole("button", { name: "Crear ciclo" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "El ciclo se creó correctamente" }),
  ).toBeVisible();

  const cyclesResponse = await page.request.get("/api/admin/cycles");
  expect(cyclesResponse.status()).toBe(200);
  const cycles: Array<{ id: string; name: string; status: string }> = (
    await cyclesResponse.json()
  ).cycles;
  const successorCycle = cycles.find((cycle) => cycle.name === "2028");
  expect(successorCycle).toBeDefined();
  expect(successorCycle!.status).toBe("OPEN");

  const membershipResponse = await page.request.patch(
    `/api/admin/tutors/${E2E_PRIMARY_TUTOR_ID}`,
    { data: { cycleId: successorCycle!.id } },
  );
  expect(membershipResponse.status()).toBe(200);

  const successorWorkspaceResponse = await page.request.get("/api/admin/hours");
  expect(successorWorkspaceResponse.status()).toBe(200);
  const successorWorkspace: {
    currentCycle: { id: string; status: string };
    balances: Array<{
      tutor: { id: string };
      cycle: { id: string; status: string };
      signedBalanceMinutes: number;
      state: string;
    }>;
  } = await successorWorkspaceResponse.json();
  expect(successorWorkspace.currentCycle).toEqual({
    id: successorCycle!.id,
    name: "2028",
    startDate: "2028-01-01",
    endDate: "2028-12-31",
    status: "OPEN",
  });
  expect(successorWorkspace.balances).toEqual([
    expect.objectContaining({
      tutor: expect.objectContaining({ id: E2E_PRIMARY_TUTOR_ID }),
      cycle: expect.objectContaining({ id: successorCycle!.id, status: "OPEN" }),
      signedBalanceMinutes: 0,
      state: "current",
    }),
  ]);

  const successorMovementsResponse = await page.request.get(
    `/api/admin/hours/movements?cycleId=${successorCycle!.id}&tutorId=${E2E_PRIMARY_TUTOR_ID}`,
  );
  expect(successorMovementsResponse.status()).toBe(200);
  await expect(successorMovementsResponse.json()).resolves.toEqual({ movements: [] });

  const successorCycleRow = cycleHistory
    .locator("li")
    .filter({ hasText: "2028" });
  await expect(successorCycleRow).toContainText("Abierto");
});
