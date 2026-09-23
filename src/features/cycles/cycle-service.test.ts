import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/db/client-core";
import { auditEvent } from "@/db/schema";

vi.mock("server-only", () => ({}));

import {
  CYCLE_ERROR_CODES,
  closeAdministrativeCycle,
  createAdministrativeCycle,
  getCurrentAdministrativeCycle,
  listAdministrativeCycles,
} from "./cycle-service";

const openCycle = {
  id: "cycle-1",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const closedCycle = {
  ...openCycle,
  status: "CLOSED" as const,
  updatedAt: new Date("2026-09-16T12:00:00.000Z"),
};

function asDatabase(value: unknown) {
  return value as Database;
}

function createTransactionDatabase({
  selected = [],
  inserted = openCycle,
  updated = closedCycle,
  updateResult,
}: {
  selected?: unknown[];
  inserted?: typeof openCycle;
  updated?: typeof closedCycle;
  updateResult?: unknown[];
} = {}) {
  const selectedLimit = vi.fn().mockResolvedValue(selected);
  const selectedWhere = vi.fn().mockReturnValue({ limit: selectedLimit });
  const selectedFrom = vi.fn().mockReturnValue({ where: selectedWhere });
  const select = vi.fn().mockReturnValue({ from: selectedFrom });

  const insertedValues: unknown[] = [];
  const auditValues: unknown[] = [];
  const insert = vi.fn().mockImplementation((table: unknown) => {
    const isAuditInsert = table === auditEvent;
    const values = vi.fn().mockImplementation((value: unknown) => {
      (isAuditInsert ? auditValues : insertedValues).push(value);

      return {
        returning: vi.fn().mockResolvedValue(
          isAuditInsert ? [{ id: "audit-1" }] : [inserted],
        ),
      };
    });

    return { values };
  });

  const updateReturning = vi
    .fn()
    .mockResolvedValue(updateResult ?? [updated]);
  const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set: updateSet });

  const transaction = { select, insert, update };
  const database = {
    transaction: vi.fn(async (callback: (db: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };

  return {
    database: asDatabase(database),
    databaseTransaction: database.transaction,
    insertedValues,
    auditValues,
    insert,
    update,
  };
}

describe("AdministrativeCycle service", () => {
  it("rejects invalid and reversed date ranges before opening a transaction", async () => {
    const database = {
      transaction: vi.fn(),
    };

    await expect(
      createAdministrativeCycle(asDatabase(database), {
        name: "Ciclo inválido",
        startDate: "2026-02-30",
        endDate: "2026-03-01",
      }),
    ).rejects.toThrow();
    await expect(
      createAdministrativeCycle(asDatabase(database), {
        name: "Ciclo invertido",
        startDate: "2026-12-31",
        endDate: "2026-01-01",
      }),
    ).rejects.toMatchObject({ code: CYCLE_ERROR_CODES.invalidDateRange });

    expect(database.transaction).not.toHaveBeenCalled();
  });

  it("rejects a second open cycle and maps the database unique constraint", async () => {
    const existing = createTransactionDatabase({ selected: [{ id: "cycle-1" }] });

    await expect(
      createAdministrativeCycle(existing.database, {
        name: "Ciclo 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      }),
    ).rejects.toMatchObject({ code: CYCLE_ERROR_CODES.openCycleExists });

    const concurrentDatabase = {
      transaction: vi.fn().mockRejectedValue({ code: "23505" }),
    };

    await expect(
      createAdministrativeCycle(asDatabase(concurrentDatabase), {
        name: "Ciclo 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      }),
    ).rejects.toMatchObject({ code: CYCLE_ERROR_CODES.openCycleExists });
  });

  it("creates a cycle and its audit event in the same transaction", async () => {
    const database = createTransactionDatabase({
      selected: [],
      inserted: openCycle,
    });

    await expect(
      createAdministrativeCycle(
        database.database,
        {
          name: "  Ciclo 2026 ",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
        { actorId: "admin-1", requestId: "request-1", ipAddress: "127.0.0.1" },
      ),
    ).resolves.toEqual({
      id: openCycle.id,
      name: openCycle.name,
      startDate: openCycle.startDate,
      endDate: openCycle.endDate,
      status: openCycle.status,
      createdAt: openCycle.createdAt.toISOString(),
      updatedAt: openCycle.updatedAt.toISOString(),
    });

    expect(database.databaseTransaction).toHaveBeenCalledTimes(1);
    expect(database.insertedValues[0]).toEqual({
      name: "Ciclo 2026",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "OPEN",
    });
    expect(database.auditValues[0]).toMatchObject({
      actorId: "admin-1",
      action: "cycle.created",
      entityType: "administrative_cycle",
      entityId: openCycle.id,
      metadata: {
        startDate: openCycle.startDate,
        endDate: openCycle.endDate,
        status: "OPEN",
      },
    });
  });

  it("closes an open cycle and records the Admin actor", async () => {
    const database = createTransactionDatabase({
      selected: [{ id: openCycle.id, status: "OPEN" }],
      updated: closedCycle,
    });

    await expect(
      closeAdministrativeCycle(database.database, openCycle.id, {
        actorId: "admin-1",
      }),
    ).resolves.toMatchObject({
      id: closedCycle.id,
      status: "CLOSED",
    });

    expect(database.auditValues[0]).toMatchObject({
      actorId: "admin-1",
      action: "cycle.closed",
      entityType: "administrative_cycle",
      entityId: openCycle.id,
      metadata: { previousStatus: "OPEN", status: "CLOSED" },
    });
  });

  it("keeps missing and repeated close operations stable", async () => {
    const missing = createTransactionDatabase({ selected: [] });
    await expect(
      closeAdministrativeCycle(missing.database, "cycle-missing"),
    ).rejects.toMatchObject({ code: CYCLE_ERROR_CODES.cycleNotFound });

    const alreadyClosed = createTransactionDatabase({
      selected: [{ id: closedCycle.id, status: "CLOSED" }],
    });
    await expect(
      closeAdministrativeCycle(alreadyClosed.database, closedCycle.id),
    ).rejects.toMatchObject({ code: CYCLE_ERROR_CODES.cycleAlreadyClosed });

    const concurrentClose = createTransactionDatabase({
      selected: [{ id: openCycle.id, status: "OPEN" }],
      updateResult: [],
    });
    await expect(
      closeAdministrativeCycle(concurrentClose.database, openCycle.id),
    ).rejects.toMatchObject({ code: CYCLE_ERROR_CODES.cycleAlreadyClosed });
  });

  it("returns the current cycle and ordered history as safe records", async () => {
    const selectLimit = vi.fn().mockResolvedValue([openCycle]);
    const selectWhere = vi.fn().mockReturnValue({ limit: selectLimit });
    const selectOrderBy = vi.fn().mockResolvedValue([openCycle, closedCycle]);
    const selectFrom = vi.fn().mockReturnValue({
      where: selectWhere,
      orderBy: selectOrderBy,
    });
    const select = vi.fn().mockReturnValue({ from: selectFrom });
    const database = asDatabase({ select });

    await expect(getCurrentAdministrativeCycle(database)).resolves.toMatchObject({
      id: openCycle.id,
      status: "OPEN",
      createdAt: openCycle.createdAt.toISOString(),
    });
    await expect(listAdministrativeCycles(database)).resolves.toHaveLength(2);
    expect(selectOrderBy).toHaveBeenCalledTimes(1);
  });

  it("does not hide transaction failures", async () => {
    const database = {
      transaction: vi.fn().mockRejectedValue(new Error("transaction failed")),
    };

    await expect(
      createAdministrativeCycle(asDatabase(database), {
        name: "Ciclo 2026",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      }),
    ).rejects.toThrow("transaction failed");
  });
});
