import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { Database } from "@/db/client-core";
import {
  activity,
  administrativeCycle,
  attendanceRecord,
  career,
  consultation,
  dutyOccurrence,
  hourCategory,
  hourMovement,
  scheduleAssignment,
  schedulePlan,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
} from "@/db/schema";
import {
  getCurrentAdministrativeCycle,
  type SafeAdministrativeCycle,
} from "@/features/cycles/cycle-service";
import { getIsoWeekday } from "@/features/schedules/schedule-validation";

import {
  parseReportFilterInput,
  ReportFilterValidationError,
  resolveReportFilters,
  type ParsedReportFilterInput,
} from "./report-validation";
import type {
  ActivityGroup,
  ActivityReport,
  AttendanceReport,
  ConsultationDemandReport,
  CurrentBalanceReport,
  LimitedReportGroups,
  MovementGroup,
  MovementReport,
  OperationalReport,
  PlannedScheduleReport,
  ReportCycleContext,
  ReportFilters,
  ReportGroup,
  ReportSection,
  ScheduleKindReport,
  ScheduleTutorReport,
  SubjectCoverageReport,
} from "./report-types";

const businessTimeZone = "America/Argentina/Buenos_Aires";
const breakdownLimit = 50;
const movementGroupLimit = 1_000;
const modalityUnspecified = "UNSPECIFIED";

type SchedulePlanRow = {
  id: string;
  cycleId: string;
  kind: "REGULAR" | "SPECIAL";
  validFrom: string;
  validTo: string;
  updatedAt: Date;
};

export const REPORT_ERROR_CODES = {
  dateRangeUnavailable: "date_range_unavailable",
} as const;

export interface ReportFilterOptions {
  careers: Array<{ id: string; label: string }>;
  subjects: Array<{ id: string; label: string }>;
  tutors: Array<{ id: string; label: string }>;
  modalities: string[];
}

export class ReportServiceError extends Error {
  readonly code: (typeof REPORT_ERROR_CODES)[keyof typeof REPORT_ERROR_CODES];

  constructor(
    code: (typeof REPORT_ERROR_CODES)[keyof typeof REPORT_ERROR_CODES],
    message: string,
  ) {
    super(message);
    this.name = "ReportServiceError";
    this.code = code;
  }
}

function getCurrentDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function getMinuteOfDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return value("hour") * 60 + value("minute");
}

function countLimited<T>(rows: T[], limit = breakdownLimit): LimitedReportGroups<T> {
  return { items: rows.slice(0, limit), truncated: rows.length > limit };
}

function groupCount(value: number | string | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value);
}

function ready<T>(data: T): ReportSection<T> {
  return { status: "ready", data };
}

function unavailable<T>(): ReportSection<T> {
  return { status: "unavailable", reason: "NO_OPEN_CYCLE" };
}

async function capture<T>(query: Promise<T>): Promise<ReportSection<T>> {
  try {
    return ready(await query);
  } catch {
    return { status: "error" };
  }
}

function invalidReference(path: string, message: string): never {
  throw new ReportFilterValidationError([
    { code: "custom", path: [path], message },
  ]);
}

async function validateFilterReferences(
  db: Database,
  filters: ParsedReportFilterInput,
) {
  if (filters.careerId !== undefined) {
    const [existing] = await db
      .select({ id: career.id })
      .from(career)
      .where(eq(career.id, filters.careerId))
      .limit(1);
    if (existing === undefined) {
      invalidReference("careerId", "La carrera seleccionada no existe.");
    }
  }

  if (filters.subjectId !== undefined) {
    const [existing] = await db
      .select({ id: subject.id, careerId: subject.careerId })
      .from(subject)
      .where(eq(subject.id, filters.subjectId))
      .limit(1);
    if (existing === undefined) {
      invalidReference("subjectId", "La materia seleccionada no existe.");
    }
    if (
      filters.careerId !== undefined &&
      existing.careerId !== filters.careerId
    ) {
      invalidReference(
        "subjectId",
        "La materia seleccionada no pertenece a la carrera indicada.",
      );
    }
  }

  if (filters.tutorId !== undefined) {
    const [existing] = await db
      .select({ id: tutor.id })
      .from(tutor)
      .where(eq(tutor.id, filters.tutorId))
      .limit(1);
    if (existing === undefined) {
      invalidReference("tutorId", "El tutor seleccionado no existe.");
    }
  }
}

function consultationConditions(
  filters: ReportFilters,
  options: { subjectsOnly?: boolean } = {},
) {
  const conditions: SQL[] = [
    gte(consultation.consultationDate, filters.fromDate),
    lte(consultation.consultationDate, filters.toDate),
  ];

  if (filters.careerId !== undefined) {
    conditions.push(eq(consultation.careerId, filters.careerId));
  }
  if (filters.subjectId !== undefined) {
    conditions.push(eq(consultation.subjectId, filters.subjectId));
  }
  if (filters.tutorId !== undefined) {
    conditions.push(eq(consultation.tutorId, filters.tutorId));
  }
  if (filters.modality !== undefined) {
    conditions.push(
      filters.modality === modalityUnspecified
        ? isNull(consultation.modality)
        : eq(consultation.modality, filters.modality),
    );
  }
  if (options.subjectsOnly === true) {
    conditions.push(eq(consultation.classification, "SUBJECT"));
  }

  return and(...conditions);
}

async function getConsultationDemand(
  db: Database,
  filters: ReportFilters,
): Promise<ConsultationDemandReport> {
  const conditions = consultationConditions(filters);
  const subjectConditions = consultationConditions(filters, {
    subjectsOnly: true,
  });
  const rankedLimit = breakdownLimit + 1;
  const totalCount = count();
  const [totals, careers, subjects, tutors, modalities, stages, months] =
    await Promise.all([
      db
        .select({
          total: totalCount,
          subjectTotal: sql<number>`count(*) filter (where ${consultation.classification} = ${"SUBJECT"})`,
          generalTotal: sql<number>`count(*) filter (where ${consultation.classification} = ${"GENERAL"})`,
        })
        .from(consultation)
        .where(conditions),
      db
        .select({
          key: career.id,
          label: career.name,
          count: totalCount,
        })
        .from(consultation)
        .innerJoin(career, eq(career.id, consultation.careerId))
        .where(conditions)
        .groupBy(career.id, career.name, career.normalizedName)
        .orderBy(desc(totalCount), asc(career.normalizedName), asc(career.id))
        .limit(rankedLimit),
      db
        .select({
          key: subject.id,
          label: subject.name,
          count: totalCount,
        })
        .from(consultation)
        .innerJoin(subject, eq(subject.id, consultation.subjectId))
        .where(subjectConditions)
        .groupBy(subject.id, subject.name, subject.normalizedName)
        .orderBy(desc(totalCount), asc(subject.normalizedName), asc(subject.id))
        .limit(rankedLimit),
      db
        .select({
          key: tutor.id,
          label: sql<string>`concat(${tutor.lastName}, ', ', ${tutor.firstName})`,
          count: totalCount,
        })
        .from(consultation)
        .innerJoin(tutor, eq(tutor.id, consultation.tutorId))
        .where(conditions)
        .groupBy(tutor.id, tutor.lastName, tutor.firstName)
        .orderBy(desc(totalCount), asc(sql`lower(${tutor.lastName})`), asc(sql`lower(${tutor.firstName})`), asc(tutor.id))
        .limit(rankedLimit),
      db
        .select({ key: consultation.modality, count: totalCount })
        .from(consultation)
        .where(conditions)
        .groupBy(consultation.modality)
        .orderBy(desc(totalCount), asc(consultation.modality))
        .limit(rankedLimit),
      db
        .select({ key: consultation.academicStage, count: totalCount })
        .from(consultation)
        .where(conditions)
        .groupBy(consultation.academicStage)
        .orderBy(desc(totalCount), asc(consultation.academicStage))
        .limit(rankedLimit),
      db
        .select({
          key: sql<string>`to_char(date_trunc('month', ${consultation.consultationDate}::date), 'YYYY-MM')`,
          count: totalCount,
        })
        .from(consultation)
        .where(conditions)
        .groupBy(sql`date_trunc('month', ${consultation.consultationDate}::date)`)
        .orderBy(sql`date_trunc('month', ${consultation.consultationDate}::date)`),
    ]);

  const [summary] = totals;
  const modalityGroups: ReportGroup<string | null>[] = modalities.map((row) => ({
    key: row.key,
    label: row.key ?? "Sin especificar",
    count: row.count,
  }));
  const stageGroups: ReportGroup<string | null>[] = stages.map((row) => ({
    key: row.key,
    label: row.key ?? "Sin especificar",
    count: row.count,
  }));

  return {
    total: summary?.total ?? 0,
    subjectTotal: groupCount(summary?.subjectTotal),
    generalTotal: groupCount(summary?.generalTotal),
    byCareer: countLimited(careers),
    bySubject: countLimited(subjects),
    byTutor: countLimited(tutors),
    byModality: countLimited(modalityGroups),
    byAcademicStage: countLimited(stageGroups),
    byMonth: months.map((row) => ({ ...row, label: row.key })),
  };
}

async function getActiveTutorCount(
  db: Database,
  filters: ReportFilters,
) {
  const conditions: SQL[] = [eq(tutor.status, "ACTIVE")];
  if (filters.careerId !== undefined) {
    conditions.push(eq(tutor.primaryCareerId, filters.careerId));
  }
  if (filters.tutorId !== undefined) {
    conditions.push(eq(tutor.id, filters.tutorId));
  }

  const [result] = await db
    .select({ count: count() })
    .from(tutor)
    .where(and(...conditions));

  return { count: result?.count ?? 0 };
}

async function getSubjectCoverage(
  db: Database,
  cycle: SafeAdministrativeCycle,
  filters: ReportFilters,
): Promise<SubjectCoverageReport> {
  const subjectConditions: SQL[] = [
    eq(subject.status, "ACTIVE"),
    eq(career.status, "ACTIVE"),
  ];
  if (filters.careerId !== undefined) {
    subjectConditions.push(eq(career.id, filters.careerId));
  }
  if (filters.subjectId !== undefined) {
    subjectConditions.push(eq(subject.id, filters.subjectId));
  }

  const [totalRow] = await db
    .select({ count: count() })
    .from(subject)
    .innerJoin(career, eq(career.id, subject.careerId))
    .where(and(...subjectConditions));

  const coveredConditions: SQL[] = [
    ...subjectConditions,
    eq(tutor.status, "ACTIVE"),
    eq(tutorCycleMembership.cycleId, cycle.id),
  ];
  if (filters.tutorId !== undefined) {
    coveredConditions.push(eq(tutor.id, filters.tutorId));
  }

  const coveredSubjects = sql<number>`count(distinct ${subject.id})`;
  const [coveredRow] = await db
    .select({ count: coveredSubjects })
    .from(subject)
    .innerJoin(career, eq(career.id, subject.careerId))
    .innerJoin(tutorSubject, eq(tutorSubject.subjectId, subject.id))
    .innerJoin(tutor, eq(tutor.id, tutorSubject.tutorId))
    .innerJoin(
      tutorCycleMembership,
      and(
        eq(tutorCycleMembership.tutorId, tutor.id),
        eq(tutorCycleMembership.cycleId, cycle.id),
      ),
    )
    .where(and(...coveredConditions));

  const totalSubjects = totalRow?.count ?? 0;
  const coveredCount = groupCount(coveredRow?.count);

  return {
    cycleId: cycle.id,
    cycleName: cycle.name,
    coveredSubjects: coveredCount,
    totalSubjects,
    coveragePercent:
      totalSubjects === 0
        ? null
        : Math.round((coveredCount / totalSubjects) * 10_000) / 100,
  };
}

const signedBalanceMinutes = sql<string>`coalesce(
  sum(
    case
      when ${hourMovement.direction} = ${"CREDIT"} then ${hourMovement.durationMinutes}
      else -${hourMovement.durationMinutes}
    end
  ),
  0
)::text`;

async function getCurrentBalanceReport(
  db: Database,
  cycle: SafeAdministrativeCycle,
  filters: ReportFilters,
): Promise<CurrentBalanceReport> {
  const conditions: SQL[] = [
    eq(tutor.status, "ACTIVE"),
    eq(tutorCycleMembership.cycleId, cycle.id),
  ];
  if (filters.careerId !== undefined) {
    conditions.push(eq(tutor.primaryCareerId, filters.careerId));
  }
  if (filters.tutorId !== undefined) {
    conditions.push(eq(tutor.id, filters.tutorId));
  }

  const balances = db
    .select({ balance: signedBalanceMinutes.as("balance") })
    .from(tutor)
    .innerJoin(
      tutorCycleMembership,
      and(
        eq(tutorCycleMembership.tutorId, tutor.id),
        eq(tutorCycleMembership.cycleId, cycle.id),
      ),
    )
    .leftJoin(
      hourMovement,
      and(
        eq(hourMovement.tutorId, tutor.id),
        eq(hourMovement.cycleId, cycle.id),
      ),
    )
    .where(and(...conditions))
    .groupBy(tutor.id)
    .as("tutor_balances");

  const [result] = await db.select({
    totalTutors: count(),
    owes: sql<number>`count(*) filter (where ${balances.balance}::numeric < 0)`,
    current: sql<number>`count(*) filter (where ${balances.balance}::numeric >= 0)`,
  }).from(balances);

  return {
    cycleId: cycle.id,
    cycleName: cycle.name,
    totalTutors: result?.totalTutors ?? 0,
    owes: groupCount(result?.owes),
    current: groupCount(result?.current),
  };
}

async function getAttendanceReport(
  db: Database,
  filters: ReportFilters,
  now: Date,
): Promise<AttendanceReport> {
  const currentDate = getCurrentDate(now);
  const minuteOfDay = getMinuteOfDay(now);
  const conditions: SQL[] = [
    gte(dutyOccurrence.occurrenceDate, filters.fromDate),
    lte(dutyOccurrence.occurrenceDate, filters.toDate),
    or(
      lt(dutyOccurrence.occurrenceDate, currentDate),
      and(
        eq(dutyOccurrence.occurrenceDate, currentDate),
        lte(dutyOccurrence.endMinutes, minuteOfDay),
      ),
    )!,
  ];
  if (filters.tutorId !== undefined) {
    conditions.push(eq(dutyOccurrence.tutorId, filters.tutorId));
  }
  if (filters.modality !== undefined) {
    conditions.push(
      filters.modality === modalityUnspecified
        ? isNull(dutyOccurrence.modality)
        : eq(dutyOccurrence.modality, filters.modality),
    );
  }

  const [result] = await db
    .select({
      dueOccurrences: count(),
      present: sql<number>`count(*) filter (where ${attendanceRecord.status} = ${"PRESENT"})`,
      absent: sql<number>`count(*) filter (where ${attendanceRecord.status} = ${"ABSENT"})`,
      pending: sql<number>`count(*) filter (where ${attendanceRecord.id} is null or ${attendanceRecord.status} = ${"PENDING"})`,
    })
    .from(dutyOccurrence)
    .leftJoin(
      attendanceRecord,
      eq(attendanceRecord.occurrenceId, dutyOccurrence.id),
    )
    .where(and(...conditions));

  const present = groupCount(result?.present);
  const absent = groupCount(result?.absent);
  const pending = groupCount(result?.pending);
  const dueOccurrences = result?.dueOccurrences ?? 0;
  const registered = present + absent;

  return {
    dueOccurrences,
    present,
    absent,
    pending,
    registered,
    registrationRatePercent:
      dueOccurrences === 0
        ? null
        : Math.round((registered / dueOccurrences) * 10_000) / 100,
  };
}

function chooseEffectivePlan(plans: SchedulePlanRow[], date: string) {
  const specials = plans
    .filter(
      (plan) =>
        plan.kind === "SPECIAL" &&
        plan.validFrom <= date &&
        plan.validTo >= date,
    )
    .sort(
      (left, right) =>
        left.validFrom.localeCompare(right.validFrom) ||
        left.id.localeCompare(right.id),
    );

  if (specials.length > 1) {
    throw new Error("Multiple active special schedule plans apply on one date.");
  }
  if (specials[0] !== undefined) {
    return specials[0];
  }

  return plans
    .filter(
      (plan) =>
        plan.kind === "REGULAR" &&
        plan.validFrom <= date &&
        plan.validTo >= date,
    )
    .sort(
      (left, right) =>
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.id.localeCompare(right.id),
    )[0];
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function getScheduleModalityCondition(modality: string | undefined) {
  if (modality === undefined) {
    return undefined;
  }
  return modality === modalityUnspecified
    ? isNull(scheduleAssignment.modality)
    : eq(scheduleAssignment.modality, modality);
}

function emptyScheduleReport(): PlannedScheduleReport {
  return {
    totalOccurrences: 0,
    totalMinutes: 0,
    byKind: [
      { kind: "DUTY", count: 0, minutes: 0 },
      { kind: "RECOVERY", count: 0, minutes: 0 },
    ],
    byTutor: { items: [], truncated: false },
  };
}

async function getPlannedScheduleReport(
  db: Database,
  filters: ReportFilters,
): Promise<PlannedScheduleReport> {
  const planRows = await db
    .select({
      id: schedulePlan.id,
      cycleId: schedulePlan.cycleId,
      kind: schedulePlan.kind,
      validFrom: schedulePlan.validFrom,
      validTo: schedulePlan.validTo,
      updatedAt: schedulePlan.updatedAt,
      cycleStartDate: administrativeCycle.startDate,
      cycleEndDate: administrativeCycle.endDate,
    })
    .from(schedulePlan)
    .innerJoin(
      administrativeCycle,
      eq(administrativeCycle.id, schedulePlan.cycleId),
    )
    .where(
      and(
        eq(schedulePlan.status, "ACTIVE"),
        lte(schedulePlan.validFrom, filters.toDate),
        gte(schedulePlan.validTo, filters.fromDate),
        lte(administrativeCycle.startDate, filters.toDate),
        gte(administrativeCycle.endDate, filters.fromDate),
      ),
    )
    .orderBy(asc(schedulePlan.cycleId), asc(schedulePlan.validFrom), asc(schedulePlan.id))
    .limit(501);

  if (planRows.length > 500) {
    throw new Error("The report period includes too many active schedule plans.");
  }
  if (planRows.length === 0) {
    return emptyScheduleReport();
  }

  const planIds = planRows.map((plan) => plan.id);
  const assignmentConditions: (SQL | undefined)[] = [
    inArray(scheduleAssignment.planId, planIds),
    eq(scheduleAssignment.status, "ACTIVE"),
    filters.tutorId === undefined
      ? undefined
      : eq(scheduleAssignment.tutorId, filters.tutorId),
    getScheduleModalityCondition(filters.modality),
  ];
  const assignments = await db
    .select({
      planId: scheduleAssignment.planId,
      tutorId: scheduleAssignment.tutorId,
      tutorName: sql<string>`concat(${tutor.lastName}, ', ', ${tutor.firstName})`,
      pattern: scheduleAssignment.pattern,
      weekday: scheduleAssignment.weekday,
      assignmentDate: scheduleAssignment.assignmentDate,
      startMinutes: scheduleAssignment.startMinutes,
      endMinutes: scheduleAssignment.endMinutes,
      kind: scheduleAssignment.kind,
    })
    .from(scheduleAssignment)
    .innerJoin(tutor, eq(tutor.id, scheduleAssignment.tutorId))
    .where(and(...assignmentConditions))
    .orderBy(asc(scheduleAssignment.planId), asc(scheduleAssignment.startMinutes))
    .limit(5_001);

  if (assignments.length > 5_000) {
    throw new Error("The report period includes too many active assignments.");
  }

  const plansByCycle = new Map<string, SchedulePlanRow[]>();
  const cycles = new Map<string, { startDate: string; endDate: string }>();
  for (const row of planRows) {
    const cyclePlans = plansByCycle.get(row.cycleId) ?? [];
    cyclePlans.push({
      id: row.id,
      cycleId: row.cycleId,
      kind: row.kind,
      validFrom: row.validFrom,
      validTo: row.validTo,
      updatedAt: row.updatedAt,
    });
    plansByCycle.set(row.cycleId, cyclePlans);
    cycles.set(row.cycleId, {
      startDate: row.cycleStartDate,
      endDate: row.cycleEndDate,
    });
  }

  const assignmentsByPlan = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const planAssignments = assignmentsByPlan.get(assignment.planId) ?? [];
    planAssignments.push(assignment);
    assignmentsByPlan.set(assignment.planId, planAssignments);
  }

  const kindTotals = new Map<"DUTY" | "RECOVERY", { count: number; minutes: number }>([
    ["DUTY", { count: 0, minutes: 0 }],
    ["RECOVERY", { count: 0, minutes: 0 }],
  ]);
  const tutorTotals = new Map<string, ScheduleTutorReport>();
  let totalOccurrences = 0;
  let totalMinutes = 0;

  for (const [cycleId, cycle] of cycles) {
    const cyclePlans = plansByCycle.get(cycleId) ?? [];
    const firstDate = filters.fromDate > cycle.startDate
      ? filters.fromDate
      : cycle.startDate;
    const lastDate = filters.toDate < cycle.endDate
      ? filters.toDate
      : cycle.endDate;

    for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
      const plan = chooseEffectivePlan(cyclePlans, date);
      if (plan === undefined) {
        continue;
      }

      const effectiveAssignments = (assignmentsByPlan.get(plan.id) ?? []).filter(
        (assignment) =>
          (assignment.pattern === "WEEKDAY" &&
            assignment.weekday === getIsoWeekday(date)) ||
          (assignment.pattern === "DATE" && assignment.assignmentDate === date),
      );

      for (const assignment of effectiveAssignments) {
        const minutes = assignment.endMinutes - assignment.startMinutes;
        totalOccurrences += 1;
        totalMinutes += minutes;

        const kindTotal = kindTotals.get(assignment.kind)!;
        kindTotal.count += 1;
        kindTotal.minutes += minutes;

        const existingTutor = tutorTotals.get(assignment.tutorId);
        if (existingTutor === undefined) {
          tutorTotals.set(assignment.tutorId, {
            key: assignment.tutorId,
            label: assignment.tutorName,
            count: 1,
            minutes,
          });
        } else {
          existingTutor.count += 1;
          existingTutor.minutes += minutes;
        }
      }
    }
  }

  const byTutor = [...tutorTotals.values()].sort(
    (left, right) =>
      right.count - left.count || left.label.localeCompare(right.label),
  );

  return {
    totalOccurrences,
    totalMinutes,
    byKind: [...kindTotals.entries()].map(([kind, totals]): ScheduleKindReport => ({
      kind,
      ...totals,
    })),
    byTutor: countLimited(byTutor),
  };
}

async function getMovementReport(
  db: Database,
  filters: ReportFilters,
): Promise<MovementReport> {
  const conditions: SQL[] = [
    gte(hourMovement.movementDate, filters.fromDate),
    lte(hourMovement.movementDate, filters.toDate),
  ];
  if (filters.tutorId !== undefined) {
    conditions.push(eq(hourMovement.tutorId, filters.tutorId));
  }

  const creditCount = sql<number>`count(*) filter (where ${hourMovement.direction} = ${"CREDIT"})`;
  const debitCount = sql<number>`count(*) filter (where ${hourMovement.direction} = ${"DEBIT"})`;
  const creditMinutes = sql<string>`coalesce(sum(${hourMovement.durationMinutes}) filter (where ${hourMovement.direction} = ${"CREDIT"}), 0)::text`;
  const debitMinutes = sql<string>`coalesce(sum(${hourMovement.durationMinutes}) filter (where ${hourMovement.direction} = ${"DEBIT"}), 0)::text`;
  const [totals, groupedRows] = await Promise.all([
    db
      .select({ creditCount, debitCount, creditMinutes, debitMinutes })
      .from(hourMovement)
      .where(and(...conditions)),
    db
      .select({
        date: hourMovement.movementDate,
        direction: hourMovement.direction,
        categoryId: hourCategory.id,
        category: hourCategory.name,
        count: count(),
        minutes: sql<string>`sum(${hourMovement.durationMinutes})::text`,
      })
      .from(hourMovement)
      .innerJoin(hourCategory, eq(hourCategory.id, hourMovement.categoryId))
      .where(and(...conditions))
      .groupBy(
        hourMovement.movementDate,
        hourMovement.direction,
        hourCategory.id,
        hourCategory.name,
        hourCategory.normalizedName,
      )
      .orderBy(
        desc(hourMovement.movementDate),
        asc(hourCategory.normalizedName),
        asc(hourMovement.direction),
      )
      .limit(movementGroupLimit + 1),
  ]);

  const [summary] = totals;
  const credits = groupCount(summary?.creditMinutes);
  const debits = groupCount(summary?.debitMinutes);
  const groups: MovementGroup[] = groupedRows.map((row) => ({
    date: row.date,
    direction: row.direction,
    categoryId: row.categoryId,
    category: row.category,
    count: row.count,
    minutes: groupCount(row.minutes),
  }));

  return {
    creditCount: groupCount(summary?.creditCount),
    debitCount: groupCount(summary?.debitCount),
    creditMinutes: credits,
    debitMinutes: debits,
    netMinutes: credits - debits,
    groups: countLimited(groups, movementGroupLimit),
  };
}

async function getActivityReport(
  db: Database,
  filters: ReportFilters,
): Promise<ActivityReport> {
  const conditions: SQL[] = [
    gte(activity.activityDate, filters.fromDate),
    lte(activity.activityDate, filters.toDate),
  ];
  if (filters.tutorId !== undefined) {
    conditions.push(eq(hourMovement.tutorId, filters.tutorId));
  }

  const activities = db
    .selectDistinct({
      id: activity.id,
      date: activity.activityDate,
      kind: activity.kind,
      durationMinutes: activity.durationMinutes,
    })
    .from(activity)
    .leftJoin(hourMovement, eq(hourMovement.activityId, activity.id))
    .where(and(...conditions))
    .as("report_activities");

  const rows = await db
    .select({
      date: activities.date,
      kind: activities.kind,
      count: count(),
      minutes: sql<string>`sum(${activities.durationMinutes})::text`,
    })
    .from(activities)
    .groupBy(activities.date, activities.kind)
    .orderBy(asc(activities.date), asc(activities.kind));

  const groups: ActivityGroup[] = rows.map((row) => ({
    date: row.date,
    kind: row.kind,
    count: row.count,
    minutes: groupCount(row.minutes),
  }));

  return {
    totalActivities: groups.reduce((total, row) => total + row.count, 0),
    totalMinutes: groups.reduce((total, row) => total + row.minutes, 0),
    groups,
  };
}

export async function getOperationalReport(
  db: Database,
  input: unknown,
  now = new Date(),
): Promise<OperationalReport> {
  const parsedFilters = parseReportFilterInput(input);
  await validateFilterReferences(db, parsedFilters);

  const currentDate = getCurrentDate(now);
  let currentCycle: SafeAdministrativeCycle | null = null;
  let currentCycleReadFailed = false;
  try {
    currentCycle = await getCurrentAdministrativeCycle(db);
  } catch {
    currentCycleReadFailed = true;
  }

  if (
    currentCycleReadFailed &&
    parsedFilters.fromDate === undefined &&
    parsedFilters.toDate === undefined
  ) {
    throw new ReportServiceError(
      REPORT_ERROR_CODES.dateRangeUnavailable,
      "The default report period could not be resolved.",
    );
  }

  const filters = resolveReportFilters(
    parsedFilters,
    currentCycleReadFailed ? null : currentCycle,
    currentDate,
  );

  const currentCycleSection: ReportSection<ReportCycleContext | null> =
    currentCycleReadFailed
      ? { status: "error" }
      : ready(
          currentCycle === null
            ? null
            : { id: currentCycle.id, name: currentCycle.name },
        );
  const noCycleSection = <T,>(): ReportSection<T> =>
    currentCycleReadFailed ? { status: "error" } : unavailable<T>();

  const [
    consultationDemand,
    activeTutors,
    subjectCoverage,
    plannedSchedules,
    attendance,
    currentBalances,
    movements,
    activities,
  ] = await Promise.all([
    capture(getConsultationDemand(db, filters)),
    capture(getActiveTutorCount(db, filters)),
    currentCycle === null || currentCycleReadFailed
      ? Promise.resolve(noCycleSection<SubjectCoverageReport>())
      : capture(getSubjectCoverage(db, currentCycle, filters)),
    capture(getPlannedScheduleReport(db, filters)),
    capture(getAttendanceReport(db, filters, now)),
    currentCycle === null || currentCycleReadFailed
      ? Promise.resolve(noCycleSection<CurrentBalanceReport>())
      : capture(getCurrentBalanceReport(db, currentCycle, filters)),
    capture(getMovementReport(db, filters)),
    capture(getActivityReport(db, filters)),
  ]);

  return {
    filters,
    currentCycle: currentCycleSection,
    consultationDemand,
    activeTutors,
    subjectCoverage,
    plannedSchedules,
    attendance,
    currentBalances,
    movements,
    activities,
  };
}

export async function getReportFilterOptions(
  db: Database,
): Promise<ReportFilterOptions> {
  const [careers, subjects, tutors, consultationModalities, scheduleModalities] =
    await Promise.all([
      db
        .select({ id: career.id, label: career.name })
        .from(career)
        .orderBy(asc(career.normalizedName), asc(career.id)),
      db
        .select({
          id: subject.id,
          label: subject.name,
          careerName: career.name,
        })
        .from(subject)
        .innerJoin(career, eq(career.id, subject.careerId))
        .orderBy(
          asc(career.normalizedName),
          asc(subject.normalizedName),
          asc(subject.id),
        ),
      db
        .select({
          id: tutor.id,
          label: sql<string>`concat(${tutor.lastName}, ', ', ${tutor.firstName})`,
        })
        .from(tutor)
        .orderBy(asc(sql`lower(${tutor.lastName})`), asc(sql`lower(${tutor.firstName})`), asc(tutor.id)),
      db
        .selectDistinct({ modality: consultation.modality })
        .from(consultation)
        .where(sql`${consultation.modality} is not null`)
        .orderBy(asc(consultation.modality)),
      db
        .selectDistinct({ modality: scheduleAssignment.modality })
        .from(scheduleAssignment)
        .where(sql`${scheduleAssignment.modality} is not null`)
        .orderBy(asc(scheduleAssignment.modality)),
    ]);

  const modalities = new Set<string>();
  for (const row of [...consultationModalities, ...scheduleModalities]) {
    if (row.modality !== null) {
      modalities.add(row.modality);
    }
  }

  return {
    careers: careers.map(({ id, label }) => ({ id, label })),
    subjects: subjects.map(({ id, label, careerName }) => ({
      id,
      label: `${label} — ${careerName}`,
    })),
    tutors: tutors.map(({ id, label }) => ({ id, label })),
    modalities: [...modalities].sort((left, right) => left.localeCompare(right, "es-AR")),
  };
}
