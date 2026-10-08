import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { createDatabaseHandle, type Database } from "../src/db/client-core";
import {
  administrativeCycle,
  career,
  consultation,
  consultationStaging,
  hourMovement,
  scheduleAssignment,
  schedulePlan,
  tutor,
} from "../src/db/schema";
import { CAREER_COLORS } from "../src/shared/career-color";
import { getOperationalReport } from "../src/features/reports/report-service";
import { executeInitialDataImport, loadInitialDataPackage } from "./import-initial-data";

type ImportPackage = NonNullable<Awaited<ReturnType<typeof loadInitialDataPackage>>["data"]>;
const expectedMetricsSchema = z.record(z.string().regex(/^[A-Za-z0-9_.-]{1,160}$/), z.number().int().nonnegative());

export async function verifyInitialData(
  database: Database,
  data: ImportPackage,
  expected: Record<string, number> = {},
) {
  return database.transaction(async (tx) => {
    const checks: Record<string, boolean> = {};
    const metrics: Record<string, number> = {};
    const careerColors = await tx.select({ color: career.color }).from(career);
    checks["registry.careerColors"] = careerColors.every(({ color }) => CAREER_COLORS.includes(color));
    const counts = await executeInitialDataImport(tx, data, { apply: false });
    for (const [table, result] of Object.entries(counts)) {
      checks[`registry.${table}`] = result.created === 0 && result.updated === 0;
      metrics[`registry.${table}.unchanged`] = result.unchanged;
    }

    for (const row of await tx.select({ status: tutor.status, total: count() }).from(tutor).groupBy(tutor.status)) {
      metrics[`tutors.${row.status}`] = row.total;
    }
    for (const status of ["ACTIVE", "INACTIVE"]) metrics[`tutors.${status}`] ??= 0;

    const duties = await tx.select({ weekday: scheduleAssignment.weekday, total: count() })
      .from(scheduleAssignment).innerJoin(schedulePlan, eq(schedulePlan.id, scheduleAssignment.planId))
      .where(and(eq(schedulePlan.kind, "REGULAR"), eq(schedulePlan.status, "ACTIVE"),
        eq(scheduleAssignment.status, "ACTIVE"), eq(scheduleAssignment.kind, "DUTY")))
      .groupBy(scheduleAssignment.weekday);
    metrics["duties.total"] = duties.reduce((sum, row) => sum + row.total, 0);
    for (let day = 1; day <= 7; day++) metrics[`duties.weekday.${day}`] = duties.find(row => row.weekday === day)?.total ?? 0;

    // Verify movement-derived balances without printing tutor identities or amounts.
    let matchedBalances = 0;
    const checkedPairs = new Set<string>();
    for (const movement of data.hourMovements) {
      const values = movement.values;
      const pair = `${values.tutorId}:${values.cycleId}`;
      if (checkedPairs.has(pair)) continue;
      checkedPairs.add(pair);
      const [balance] = await tx.select({ minutes: sql<number>`coalesce(sum(case when ${hourMovement.direction} = 'CREDIT' then ${hourMovement.durationMinutes} else -${hourMovement.durationMinutes} end), 0)::integer` })
        .from(hourMovement).where(and(eq(hourMovement.tutorId, String(values.tutorId)), eq(hourMovement.cycleId, String(values.cycleId))));
      const expectedBalance = data.hourMovements.filter(row => row.values.tutorId === values.tutorId && row.values.cycleId === values.cycleId)
        .reduce((sum, row) => sum + Number(row.values.durationMinutes) * (row.values.direction === "CREDIT" ? 1 : -1), 0);
      if (balance?.minutes === expectedBalance) matchedBalances++;
    }
    metrics["balances.checked"] = checkedPairs.size;
    metrics["balances.matched"] = matchedBalances;
    checks["balances.matchOpeningValues"] = matchedBalances === checkedPairs.size;

    const [stagingTotal] = await tx.select({ total: count() }).from(consultationStaging);
    metrics["consultations.imported"] = stagingTotal?.total ?? 0;
    const [dateAndContactCounts] = await tx.select({
      invalidDates: sql<number>`count(*) filter (where ${consultationStaging.normalizedConsultationDate} is null)::integer`,
      contacts: sql<number>`count(*) filter (where ${consultationStaging.rawContact} is not null)::integer`,
      unresolvedCareers: sql<number>`count(*) filter (where ${consultationStaging.careerId} is null)::integer`,
    }).from(consultationStaging);
    metrics["consultations.invalidDates"] = dateAndContactCounts?.invalidDates ?? 0;
    metrics["consultations.withContact"] = dateAndContactCounts?.contacts ?? 0;
    metrics["consultations.unresolvedCareers"] = dateAndContactCounts?.unresolvedCareers ?? 0;
    for (const status of ["PENDING_REVIEW", "CONSOLIDATED", "DUPLICATE"] as const) {
      const [row] = await tx.select({ total: count() }).from(consultationStaging).where(eq(consultationStaging.status, status));
      metrics[`consultations.${status}`] = row?.total ?? 0;
    }
    const [canonicalTotal] = await tx.select({ total: count() }).from(consultation);
    metrics["consultations.canonical"] = canonicalTotal?.total ?? 0;
    checks["consultations.canonicalMatchesConsolidated"] = metrics["consultations.canonical"] === metrics["consultations.CONSOLIDATED"];
    for (const row of await tx.select({ id: career.id, total: count(consultationStaging.id) }).from(career)
      .leftJoin(consultationStaging, eq(career.id, consultationStaging.careerId)).groupBy(career.id)) {
      metrics[`consultations.career.${row.id}`] = row.total;
    }

    async function verifyReportPeriod(key: string, fromDate: string, toDate: string) {
      const conditions = and(gte(consultation.consultationDate, fromDate), lte(consultation.consultationDate, toDate));
      const [canonical] = await tx.select({ total: count() }).from(consultation).where(conditions);
      const report = await getOperationalReport(tx, { fromDate, toDate });
      checks[`reports.${key}`] = report.consultationDemand.status === "ready" && report.consultationDemand.data.total === canonical?.total;
      if (report.consultationDemand.status === "ready") {
        const demand = report.consultationDemand.data;
        metrics[`reports.${key}.total`] = demand.total;
        const byCareer = await tx.select({ id: consultation.careerId, total: count() }).from(consultation)
          .where(conditions).groupBy(consultation.careerId);
        checks[`reports.${key}.careers`] = !demand.byCareer.truncated &&
          demand.byCareer.items.length === byCareer.length && byCareer.every(row => demand.byCareer.items.some(item => item.key === row.id && item.count === row.total));
      }
    }
    let inCycleStaged = 0;
    let inCycleCanonical = 0;
    for (const cycle of await tx.select().from(administrativeCycle)) {
      const [staged] = await tx.select({ total: count() }).from(consultationStaging)
        .where(and(gte(consultationStaging.normalizedConsultationDate, cycle.startDate), lte(consultationStaging.normalizedConsultationDate, cycle.endDate)));
      const [canonical] = await tx.select({ total: count() }).from(consultation)
        .where(and(gte(consultation.consultationDate, cycle.startDate), lte(consultation.consultationDate, cycle.endDate)));
      metrics[`consultations.cycle.${cycle.id}.importedWithValidDate`] = staged?.total ?? 0;
      metrics[`consultations.cycle.${cycle.id}.canonical`] = canonical?.total ?? 0;
      inCycleStaged += staged?.total ?? 0;
      inCycleCanonical += canonical?.total ?? 0;
      await verifyReportPeriod(`cycle.${cycle.id}`, cycle.startDate, cycle.endDate);
    }
    metrics["consultations.outsideCycleDates"] = metrics["consultations.imported"] - metrics["consultations.invalidDates"] - inCycleStaged;
    metrics["consultations.canonicalOutsideCycleDates"] = metrics["consultations.canonical"] - inCycleCanonical;
    // Annual periods also cover valid history outside the configured cycle dates.
    const year = sql<number>`extract(year from ${consultation.consultationDate})::integer`;
    for (const row of await tx.select({ year }).from(consultation).groupBy(year)) {
      await verifyReportPeriod(`year.${row.year}`, `${row.year}-01-01`, `${row.year}-12-31`);
    }
    for (const [key, value] of Object.entries(expectedMetricsSchema.parse(expected))) {
      checks[`expected.${key}`] = metrics[key] === value;
    }
    return { verified: Object.values(checks).every(Boolean), checks, metrics };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

async function main() {
  loadEnvConfig(process.cwd());
  const args = process.argv.slice(2);
  const expectedPath = args.length === 1 && args[0]?.startsWith("--expected=") ? args[0].slice(11) : undefined;
  if (args.length > 0 && !expectedPath) {
    console.error("Usage: pnpm data:verify [--expected=<local JSON file>]");
    process.exitCode = 1;
    return;
  }
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL must be set explicitly; no default target is used.");
    process.exitCode = 1;
    return;
  }
  if (!["postgres:", "postgresql:"].includes(new URL(databaseUrl).protocol)) {
    console.error("DATABASE_URL must be a valid PostgreSQL connection URL.");
    process.exitCode = 1;
    return;
  }
  const expected = expectedPath ? expectedMetricsSchema.parse(JSON.parse(await readFile(expectedPath, "utf8"))) : {};
  const result = await loadInitialDataPackage();
  if (!result.data || result.errors.length) throw new Error("The initial data package is invalid; run data:import --dry-run for diagnostics.");
  const handle = createDatabaseHandle({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 15_000 });
  try {
    const verification = await verifyInitialData(handle.db, result.data, expected);
    console.log(JSON.stringify(verification, null, 2));
    if (!verification.verified) process.exitCode = 1;
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error("Initial data verification failed; database and source details omitted.");
    process.exitCode = 1;
  });
}
