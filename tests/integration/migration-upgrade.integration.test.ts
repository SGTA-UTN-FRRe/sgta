import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CAREER_COLORS } from "@/shared/career-color";
import migrationJournal from "../../drizzle/meta/_journal.json";
import { createDatabaseHandle, type DatabaseHandle } from "@/db/client-core";
import {
  listHourBalances,
  listHourMovements,
  reverseHourMovement,
} from "@/features/hours/hour-service";

import { getIntegrationConnectionString } from "./setup";

function identifier(value: number) {
  return `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
}

const ids = {
  admin: "upgrade-admin",
  tutorUser: "upgrade-tutor-user",
  career: identifier(1),
  cycle: identifier(2),
  tutor: identifier(3),
  regularPlan: identifier(4),
  specialPlan: identifier(5),
  dutyAssignment: identifier(6),
  recoveryAssignment: identifier(7),
  dutyOccurrence: identifier(8),
  recoveryOccurrence: identifier(9),
  attendance: identifier(10),
  absenceCategory: identifier(11),
  recoveryCategory: identifier(12),
  activity: identifier(13),
  credit: identifier(14),
  absenceDebit: identifier(15),
  reversedDebit: identifier(16),
  existingReversal: identifier(17),
};
const timestamp = "2027-04-07T12:00:00.000Z";
const movementDate = "2027-04-07";

async function seedHistoricalRecords(pool: Pool) {
  await pool.query(
    `INSERT INTO "user" (id, name, email, email_verified, role, enabled, created_at, updated_at)
     VALUES ($1, $2, $3, true, 'ADMIN', true, $7, $7),
            ($4, $5, $6, true, 'TUTOR', true, $7, $7)`,
    [ids.admin, "Upgrade Admin", "upgrade.admin@example.test",
      ids.tutorUser, "Upgrade Tutor", "upgrade.tutor@example.test", timestamp],
  );
  await pool.query(
    `INSERT INTO career (id, name, normalized_name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)`,
    [ids.career, "Upgrade Career", "upgrade career", timestamp],
  );
  // Extra careers deliberately arrive out of order; inactive careers also receive a color.
  for (let index = 8; index >= 0; index--) {
    await pool.query(`INSERT INTO career (id, name, normalized_name, status) VALUES ($1, $2, $3, $4)`,
      [identifier(100 + index), `Backfill Career ${index}`, `backfill career ${index}`, index === 0 ? "INACTIVE" : "ACTIVE"]);
  }
  await pool.query(
    `INSERT INTO administrative_cycle (id, name, start_date, end_date, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'OPEN', $5, $5)`,
    [ids.cycle, "Upgrade Cycle", "2027-01-01", "2027-12-31", timestamp],
  );
  await pool.query(
    `INSERT INTO tutor (id, first_name, last_name, primary_career_id, application_user_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [ids.tutor, "Synthetic", "Tutor", ids.career, ids.tutorUser, timestamp],
  );
  await pool.query(
    `INSERT INTO tutor_cycle_membership (tutor_id, cycle_id, created_at, updated_at)
     VALUES ($1, $2, $3, $3)`,
    [ids.tutor, ids.cycle, timestamp],
  );
  await pool.query(
    `INSERT INTO schedule_plan (id, cycle_id, name, kind, valid_from, valid_to, created_at, updated_at)
     VALUES ($1, $3, $4, 'REGULAR', $6, $7, $8, $8),
            ($2, $3, $5, 'SPECIAL', $6, $7, $8, $8)`,
    [ids.regularPlan, ids.specialPlan, ids.cycle, "Regular upgrade plan",
      "Special upgrade plan", "2027-01-01", "2027-12-31", timestamp],
  );
  await pool.query(
    `INSERT INTO schedule_assignment
       (id, plan_id, tutor_id, pattern, weekday, assignment_date, start_minutes, end_minutes, kind, modality, created_at, updated_at)
     VALUES ($1, $3, $5, 'WEEKDAY', 3, NULL, 480, 540, 'DUTY', $7, $8, $8),
            ($2, $4, $5, 'DATE', NULL, $6, 600, 690, 'RECOVERY', $7, $8, $8)`,
    [ids.dutyAssignment, ids.recoveryAssignment, ids.regularPlan, ids.specialPlan,
      ids.tutor, movementDate, "Presencial", timestamp],
  );
  await pool.query(
    `INSERT INTO duty_occurrence
       (id, cycle_id, plan_id, assignment_id, tutor_id, occurrence_date, start_minutes, end_minutes, kind, modality, created_at)
     VALUES ($1, $3, $4, $6, $8, $9, 480, 540, 'DUTY', $10, $11),
            ($2, $3, $5, $7, $8, $9, 600, 690, 'RECOVERY', $10, $11)`,
    [ids.dutyOccurrence, ids.recoveryOccurrence, ids.cycle, ids.regularPlan,
      ids.specialPlan, ids.dutyAssignment, ids.recoveryAssignment, ids.tutor,
      movementDate, "Presencial", timestamp],
  );
  await pool.query(
    `INSERT INTO attendance_record
       (id, occurrence_id, status, debit_status, proposed_debit_minutes, recognized_debit_minutes, actor_id, created_at, updated_at)
     VALUES ($1, $2, 'ABSENT', 'CONFIRMED', 60, 60, $3, $4, $4)`,
    [ids.attendance, ids.dutyOccurrence, ids.admin, timestamp],
  );
  await pool.query(
    `INSERT INTO hour_category (id, name, normalized_name, activity_kind, status, created_at, updated_at)
     VALUES ($1, $3, $4, NULL, 'ACTIVE', $7, $7),
            ($2, $5, $6, 'RECOVERY', 'ACTIVE', $7, $7)`,
    [ids.absenceCategory, ids.recoveryCategory, "Inasistencia", "inasistencia",
      "Recuperación", "recuperación", timestamp],
  );
  await pool.query(
    `INSERT INTO activity
       (id, cycle_id, kind, activity_date, duration_minutes, note, actor_id, duty_occurrence_id, created_at)
     VALUES ($1, $2, 'RECOVERY', $3, 90, $4, $5, $6, $7)`,
    [ids.activity, ids.cycle, movementDate, "Historical recovery",
      ids.admin, ids.recoveryOccurrence, timestamp],
  );
  const movements = [
    { id: ids.credit, category: ids.recoveryCategory, direction: "CREDIT", duration: 90,
      note: "Historical recovery", activity: ids.activity, attendance: null, reversal: null },
    { id: ids.absenceDebit, category: ids.absenceCategory, direction: "DEBIT", duration: 60,
      note: "Historical absence", activity: null, attendance: ids.attendance, reversal: null },
    { id: ids.reversedDebit, category: ids.absenceCategory, direction: "DEBIT", duration: 45,
      note: "Historical correction", activity: null, attendance: null, reversal: null },
    { id: ids.existingReversal, category: ids.absenceCategory, direction: "CREDIT", duration: 45,
      note: "Historical correction", activity: null, attendance: null, reversal: ids.reversedDebit },
  ];
  for (const movement of movements) {
    await pool.query(
      `INSERT INTO hour_movement
         (id, cycle_id, tutor_id, category_id, direction, duration_minutes, movement_date,
          note, activity_id, attendance_record_id, reversal_of_movement_id, actor_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [movement.id, ids.cycle, ids.tutor, movement.category, movement.direction,
        movement.duration, movementDate, movement.note, movement.activity,
        movement.attendance, movement.reversal, ids.admin, timestamp],
    );
  }
  for (const [index, movement] of movements.entries()) {
    await pool.query(
      `INSERT INTO audit_event (id, actor_id, action, entity_type, entity_id, metadata, request_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [identifier(20 + index), ids.admin,
        movement.reversal ? "hour_movement.reversed" : "hour_movement.recorded",
        "hour_movement", movement.id,
        JSON.stringify({ cycleId: ids.cycle, tutorId: ids.tutor,
          attendanceRecordId: movement.attendance,
          dutyOccurrenceId: movement.activity ? ids.recoveryOccurrence : null,
          reversalOfMovementId: movement.reversal }), "historical-upgrade", timestamp],
    );
  }
}

// Compare every retained field rather than selecting only known ledger columns.
async function retainedHistory(pool: Pool) {
  const tables = [
    "user", "career", "administrative_cycle", "tutor", "tutor_cycle_membership",
    "schedule_plan", "schedule_assignment", "hour_category", "activity",
    "hour_movement", "audit_event",
  ];
  const snapshot: Record<string, Record<string, unknown>[]> = {};
  for (const table of tables) {
    const omittedColumn = table === "activity" ? "duty_occurrence_id"
      : table === "hour_movement" ? "attendance_record_id"
      : table === "career" ? "color" : "";
    const result = await pool.query<{ record: Record<string, unknown> }>(
      `SELECT to_jsonb(retained) - $1::text AS record FROM "${table}" AS retained ORDER BY 1`,
      [omittedColumn],
    );
    snapshot[table] = result.rows.map(({ record }) => record);
  }
  return snapshot;
}

async function signedBalance(pool: Pool) {
  const result = await pool.query<{ balance: number }>(
    `SELECT sum(CASE WHEN direction = 'CREDIT' THEN duration_minutes ELSE -duration_minutes END)::integer AS balance
     FROM hour_movement WHERE cycle_id = $1 AND tutor_id = $2`,
    [ids.cycle, ids.tutor],
  );
  return result.rows[0]?.balance;
}

it("preserves populated ledger history and reversal capability across the removal upgrade", async () => {
  const migrationsFolder = path.resolve("drizzle");
  const legacyFolder = await mkdtemp(path.join(tmpdir(), "sgta-legacy-migrations-"));
  const administrativeUrl = new URL(getIntegrationConnectionString());
  administrativeUrl.pathname = "/postgres";
  const administrativePool = new Pool({ connectionString: administrativeUrl.toString() });
  const upgradeUrl = new URL(getIntegrationConnectionString());
  upgradeUrl.pathname = "/sgta_migration_upgrade";
  let handle: DatabaseHandle | undefined;
  let databaseCreated = false;

  try {
    await administrativePool.query("CREATE DATABASE sgta_migration_upgrade");
    databaseCreated = true;
    handle = createDatabaseHandle({ connectionString: upgradeUrl.toString() });
    const { pool, db } = handle;
    const entries = migrationJournal.entries.filter(({ idx }) => idx <= 10);
    await mkdir(path.join(legacyFolder, "meta"));
    await writeFile(path.join(legacyFolder, "meta", "_journal.json"),
      JSON.stringify({ ...migrationJournal, entries }));
    await Promise.all(entries.map(({ tag }) => copyFile(
      path.join(migrationsFolder, `${tag}.sql`), path.join(legacyFolder, `${tag}.sql`),
    )));
    await migrate(db, { migrationsFolder: legacyFolder });
    await seedHistoricalRecords(pool);

    expect(await signedBalance(pool)).toBe(30);
    const legacyLinks = await pool.query(
      `SELECT m.attendance_record_id, a.duty_occurrence_id
       FROM hour_movement m CROSS JOIN activity a WHERE m.id = $1 AND a.id = $2`,
      [ids.absenceDebit, ids.activity],
    );
    expect(legacyLinks.rows).toEqual([{
      attendance_record_id: ids.attendance, duty_occurrence_id: ids.recoveryOccurrence,
    }]);
    expect((await pool.query("SELECT id FROM duty_occurrence")).rows).toHaveLength(2);
    expect((await pool.query("SELECT id FROM attendance_record")).rows).toHaveLength(1);
    const before = await retainedHistory(pool);
    expect(before.hour_movement).toHaveLength(4);
    expect(before.activity).toHaveLength(1);
    expect(before.audit_event).toHaveLength(4);

    await migrate(db, { migrationsFolder });
    const backfilled = (await pool.query("SELECT color FROM career ORDER BY normalized_name, id")).rows;
    expect(backfilled.map(({ color }) => color)).toEqual(Array.from({ length: 10 }, (_, index) => CAREER_COLORS[index % CAREER_COLORS.length]));
    expect(await retainedHistory(pool)).toEqual(before);
    expect(await signedBalance(pool)).toBe(30);
    await migrate(db, { migrationsFolder });
    expect(await retainedHistory(pool)).toEqual(before);
    expect((await pool.query("SELECT color FROM career ORDER BY normalized_name, id")).rows).toEqual(backfilled);
    expect(await signedBalance(pool)).toBe(30);

    expect((await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ($1, $2)`,
      ["attendance_record", "duty_occurrence"],
    )).rows).toEqual([]);
    expect((await pool.query(
      `SELECT typname FROM pg_type JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
       WHERE nspname = 'public' AND typname IN ($1, $2)`,
      ["attendance_status", "attendance_debit_status"],
    )).rows).toEqual([]);
    expect((await pool.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND
       ((table_name = 'activity' AND column_name = $1) OR
        (table_name = 'hour_movement' AND column_name = $2))`,
      ["duty_occurrence_id", "attendance_record_id"],
    )).rows).toEqual([]);
    expect(before.hour_category).toContainEqual(expect.objectContaining({
      id: ids.absenceCategory, name: "Inasistencia", status: "ACTIVE",
    }));

    expect(await listHourBalances(db, ids.cycle)).toEqual([
      expect.objectContaining({ tutor: expect.objectContaining({ id: ids.tutor }), signedBalanceMinutes: 30 }),
    ]);
    const history = await listHourMovements(db, { cycleId: ids.cycle });
    expect(history.map(({ id }) => id).sort()).toEqual([
      ids.credit, ids.absenceDebit, ids.reversedDebit, ids.existingReversal,
    ].sort());
    expect(history).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ids.credit, origin: expect.objectContaining({ id: ids.activity, kind: "RECOVERY" }) }),
      expect.objectContaining({ id: ids.reversedDebit, reversalState: "REVERSED", reversalMovementId: ids.existingReversal }),
      expect.objectContaining({ id: ids.existingReversal, reversalState: "REVERSAL", reversalOfMovementId: ids.reversedDebit }),
    ]));

    const reversed = await reverseHourMovement(db, ids.absenceDebit, {
      actorId: ids.admin, requestId: "upgrade-reversal",
    });
    expect(reversed.original).toMatchObject({ id: ids.absenceDebit, reversalState: "REVERSED" });
    expect(reversed.reversal).toMatchObject({
      reversalOfMovementId: ids.absenceDebit, direction: "CREDIT", durationMinutes: 60,
      category: { id: ids.absenceCategory }, actor: { id: ids.admin },
    });
    expect(await signedBalance(pool)).toBe(90);
    expect(await listHourBalances(db, ids.cycle)).toEqual([
      expect.objectContaining({ signedBalanceMinutes: 90 }),
    ]);
    const afterReversal = await retainedHistory(pool);
    const { hour_movement: movementsAfter, audit_event: auditsAfter, ...unchangedAfter } = afterReversal;
    const { hour_movement: movementsBefore, audit_event: auditsBefore, ...unchangedBefore } = before;
    expect(unchangedAfter).toEqual(unchangedBefore);
    expect(movementsAfter).toHaveLength(5);
    expect(movementsAfter?.filter(({ id }) => id !== reversed.reversal.id)).toEqual(movementsBefore);
    expect(movementsAfter).toContainEqual(expect.objectContaining({
      id: reversed.reversal.id, reversal_of_movement_id: ids.absenceDebit,
      cycle_id: ids.cycle, tutor_id: ids.tutor, category_id: ids.absenceCategory,
      actor_id: ids.admin, direction: "CREDIT", duration_minutes: 60,
    }));
    expect(auditsAfter).toHaveLength(5);
    expect(auditsAfter?.filter(({ request_id }) => request_id !== "upgrade-reversal")).toEqual(auditsBefore);
    expect(auditsAfter).toContainEqual(expect.objectContaining({
      actor_id: ids.admin, action: "hour_movement.reversed", entity_id: reversed.reversal.id,
      request_id: "upgrade-reversal", metadata: expect.objectContaining({ reversalOfMovementId: ids.absenceDebit }),
    }));
  } finally {
    try {
      await handle?.close();
    } finally {
      try {
        if (databaseCreated) await administrativePool.query("DROP DATABASE sgta_migration_upgrade WITH (FORCE)");
      } finally {
        await Promise.all([administrativePool.end(), rm(legacyFolder, { recursive: true, force: true })]);
      }
    }
  }
});
