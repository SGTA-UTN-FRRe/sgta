import { randomUUID } from "node:crypto";
import path from "node:path";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  administrativeCycle,
  auditEvent,
  career,
  hourMovement,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
} from "../../src/db/schema";
import {
  executeInitialDataImport,
  loadInitialDataPackage,
} from "../../scripts/import-initial-data";
import { getIntegrationDatabase } from "./setup";

describe("initial data import", () => {
  it("dry-runs safely, imports atomically, and is idempotent", async () => {
    const database = getIntegrationDatabase();
    const result = await loadInitialDataPackage(
      path.resolve("tests/fixtures/initial-data-import"),
    );

    expect(result.errors).toEqual([]);
    expect(result.data).not.toBeNull();
    if (result.data === null) {
      throw new Error("Expected the synthetic import package to be valid.");
    }

    const [admin] = await database
      .insert(user)
      .values({
        id: "initial-data-import-admin",
        name: "Synthetic Import Admin",
        email: "initial-import-admin@example.test",
        role: "ADMIN",
        enabled: true,
      })
      .returning({ id: user.id });

    const dryRun = await executeInitialDataImport(database, result.data, {
      apply: false,
    });
    expect(dryRun.cycles).toEqual({ created: 2, updated: 0, unchanged: 0 });
    expect(dryRun.hourMovements).toEqual({ created: 1, updated: 0, unchanged: 0 });
    await expect(
      database.select({ id: administrativeCycle.id }).from(administrativeCycle),
    ).resolves.toEqual([]);
    await expect(
      database.select({ id: auditEvent.id }).from(auditEvent),
    ).resolves.toEqual([]);

    const [conflictingCareerId] = await database
      .insert(career)
      .values({
        id: randomUUID(),
        name: "Synthetic Engineering",
        normalizedName: "synthetic engineering",
        status: "ACTIVE",
      })
      .returning({ id: career.id });

    await expect(
      executeInitialDataImport(database, result.data, { apply: true }),
    ).rejects.toThrow();
    await expect(
      database.select({ id: administrativeCycle.id }).from(administrativeCycle),
    ).resolves.toEqual([]);
    await expect(
      database.select({ id: auditEvent.id }).from(auditEvent),
    ).resolves.toEqual([]);

    await database
      .delete(career)
      .where(eq(career.id, conflictingCareerId!.id));

    const firstApply = await executeInitialDataImport(database, result.data, {
      apply: true,
    });
    expect(firstApply).toMatchObject({
      cycles: { created: 2, updated: 0, unchanged: 0 },
      careers: { created: 1, updated: 0, unchanged: 0 },
      subjects: { created: 1, updated: 0, unchanged: 0 },
      hourCategories: { created: 1, updated: 0, unchanged: 0 },
      scholarshipReferences: { created: 2, updated: 0, unchanged: 0 },
      tutors: { created: 1, updated: 0, unchanged: 0 },
      tutorCycleMemberships: { created: 2, updated: 0, unchanged: 0 },
      tutorSubjects: { created: 1, updated: 0, unchanged: 0 },
      schedulePlans: { created: 1, updated: 0, unchanged: 0 },
      scheduleAssignments: { created: 1, updated: 0, unchanged: 0 },
      hourMovements: { created: 1, updated: 0, unchanged: 0 },
    });

    const importedTutorRows = await database
      .select()
      .from(tutor);
    expect(importedTutorRows).toHaveLength(1);
    expect(importedTutorRows[0]).toMatchObject({
      firstName: "Avery",
      lastName: null,
      preferredDisplayName: "Avery",
      institutionalIdentifier: "SYN-001",
    });

    const importedSubjects = await database.select().from(subject);
    expect(importedSubjects[0]?.aliases).toEqual([
      "Synthetic Math",
      "Algebra Basics",
    ]);

    const memberships = await database
      .select()
      .from(tutorCycleMembership);
    expect(memberships).toHaveLength(2);
    expect(await database.select().from(tutorSubject)).toHaveLength(1);

    const movements = await database.select().from(hourMovement);
    expect(movements).toHaveLength(1);
    expect(movements[0]?.actorId).toBe(admin!.id);

    const secondApply = await executeInitialDataImport(database, result.data, {
      apply: true,
    });
    for (const counts of Object.values(secondApply)) {
      expect(counts).toEqual({ created: 0, updated: 0, unchanged: expect.any(Number) });
    }
    expect(secondApply.cycles.unchanged).toBe(2);
    expect(secondApply.hourMovements.unchanged).toBe(1);

    const events = await database
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.action, "initial_data_import"));
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.actorId === admin!.id)).toBe(true);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metadata: expect.objectContaining({
            counts: expect.objectContaining({
              cycles: expect.objectContaining({ created: 2 }),
              hourMovements: expect.objectContaining({ created: 1 }),
            }),
          }),
        }),
      ]),
    );
  });
});
