import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
} from "drizzle-orm";

import type { Database } from "@/db/client-core";
import { getServerNow } from "@/config/clock";
import { formatFormalTutorNameSql } from "@/db/tutor-name";
import {
  consultationImportRun,
  consultationStaging,
  hourMovement,
  scheduleAssignment,
  schedulePlan,
  tutor,
  tutorCycleMembership,
} from "@/db/schema";
import {
  getCurrentAdministrativeCycle,
  type SafeAdministrativeCycle,
} from "@/features/cycles/cycle-service";
import {
  addCalendarDays,
  getArgentinaBusinessDate,
} from "@/shared/argentina-business-time";

import type { DutyView } from "./admin-overview-types";
import { SCHEDULE_MODALITY_LABELS, type ScheduleModality } from "@/shared/schedule-modality";

const upcomingDays = 7;

type ReadyResult<T> = { status: "ready"; value: T } | { status: "error" };

type ConsultationSourceHealth = {
  degraded: boolean;
};

export type AdminOverviewReadModel =
  | {
      currentDate: string;
      cycle: null;
    }
  | {
      currentDate: string;
      cycle: SafeAdministrativeCycle;
      negativeBalances: ReadyResult<number>;
      consultationReviews: ReadyResult<number>;
      consultationSource: ReadyResult<ConsultationSourceHealth>;
      upcomingDuties: ReadyResult<DutyView[]>;
    };

type PlanRow = {
  id: string;
  kind: "REGULAR" | "SPECIAL";
  validFrom: string;
  validTo: string;
  updatedAt: Date;
};

type AssignmentRow = {
  id: string;
  planId: string;
  tutorName: string;
  pattern: "WEEKDAY" | "DATE";
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
  modality: ScheduleModality;
};

export function getAdminOverviewCurrentDate(now = getServerNow()) {
  return getArgentinaBusinessDate(now);
}

function getIsoWeekday(date: string) {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function settle<T>(result: PromiseSettledResult<T>): ReadyResult<T> {
  return result.status === "fulfilled"
    ? { status: "ready", value: result.value }
    : { status: "error" };
}

async function getNegativeBalanceCount(
  db: Database,
  cycleId: string,
): Promise<number> {
  const signedMinutes = sql`coalesce(
    sum(
      case
        when ${hourMovement.direction} = ${"CREDIT"} then ${hourMovement.durationMinutes}
        else -${hourMovement.durationMinutes}
      end
    ),
    0
  )`;

  const negativeTutors = db
    .select({ tutorId: tutor.id })
    .from(tutor)
    .innerJoin(
      tutorCycleMembership,
      and(
        eq(tutorCycleMembership.tutorId, tutor.id),
        eq(tutorCycleMembership.cycleId, cycleId),
      ),
    )
    .leftJoin(
      hourMovement,
      and(
        eq(hourMovement.tutorId, tutor.id),
        eq(hourMovement.cycleId, cycleId),
      ),
    )
    .where(eq(tutor.status, "ACTIVE"))
    .groupBy(tutor.id)
    .having(sql`${signedMinutes} < 0`)
    .as("negative_tutors");

  const [result] = await db.select({ count: count() }).from(negativeTutors);
  return result?.count ?? 0;
}

async function getConsultationReviewCount(db: Database) {
  const [result] = await db
    .select({ count: count() })
    .from(consultationStaging)
    .where(eq(consultationStaging.status, "PENDING_REVIEW"));

  return result?.count ?? 0;
}

async function getConsultationSourceHealth(
  db: Database,
): Promise<ConsultationSourceHealth> {
  const [latestRun] = await db
    .select({
      status: consultationImportRun.status,
      errorRows: consultationImportRun.errorRows,
    })
    .from(consultationImportRun)
    .orderBy(desc(consultationImportRun.startedAt))
    .limit(1);

  return {
    degraded:
      latestRun?.status === "FAILED" ||
      (latestRun?.status === "PARTIAL" && latestRun.errorRows > 0),
  };
}

function chooseEffectivePlan(plans: PlanRow[], date: string) {
  const applicableSpecialPlans = plans
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

  if (applicableSpecialPlans.length > 1) {
    throw new Error("Multiple active special schedule plans apply on one date.");
  }

  if (applicableSpecialPlans[0] !== undefined) {
    return applicableSpecialPlans[0];
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

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${remainder}`;
}

function getDayLabel(date: string, today: string) {
  if (date === today) {
    return "Hoy";
  }

  if (date === addCalendarDays(today, 1)) {
    return "Mañana";
  }

  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));

  return `${label.charAt(0).toLocaleUpperCase("es-AR")}${label.slice(1)}`;
}

async function getUpcomingDuties(
  db: Database,
  cycle: SafeAdministrativeCycle,
  today: string,
): Promise<DutyView[]> {
  const firstDate = today > cycle.startDate ? today : cycle.startDate;
  if (firstDate > cycle.endDate) {
    return [];
  }

  const lastDateCandidate = addCalendarDays(firstDate, upcomingDays - 1);
  const lastDate =
    lastDateCandidate < cycle.endDate ? lastDateCandidate : cycle.endDate;
  const planRows = await db
    .select({
      id: schedulePlan.id,
      kind: schedulePlan.kind,
      validFrom: schedulePlan.validFrom,
      validTo: schedulePlan.validTo,
      updatedAt: schedulePlan.updatedAt,
    })
    .from(schedulePlan)
    .where(
      and(
        eq(schedulePlan.cycleId, cycle.id),
        eq(schedulePlan.status, "ACTIVE"),
        lte(schedulePlan.validFrom, lastDate),
        gte(schedulePlan.validTo, firstDate),
      ),
    );

  if (planRows.length === 0) {
    return [];
  }

  const assignmentRows: AssignmentRow[] = await db
    .select({
      id: scheduleAssignment.id,
      planId: scheduleAssignment.planId,
      tutorName: formatFormalTutorNameSql(tutor.lastName, tutor.firstName),
      pattern: scheduleAssignment.pattern,
      weekday: scheduleAssignment.weekday,
      assignmentDate: scheduleAssignment.assignmentDate,
      startMinutes: scheduleAssignment.startMinutes,
      endMinutes: scheduleAssignment.endMinutes,
      modality: scheduleAssignment.modality,
    })
    .from(scheduleAssignment)
    .innerJoin(tutor, eq(scheduleAssignment.tutorId, tutor.id))
    .where(
      and(
        inArray(
          scheduleAssignment.planId,
          planRows.map((plan) => plan.id),
        ),
        eq(scheduleAssignment.status, "ACTIVE"),
      ),
    );

  const results: DutyView[] = [];
  for (
    let date = firstDate;
    date <= lastDate;
    date = addCalendarDays(date, 1)
  ) {
    const effectivePlan = chooseEffectivePlan(planRows, date);
    if (effectivePlan === undefined) {
      continue;
    }

    const matchingAssignments = assignmentRows
      .filter(
        (assignment) =>
          assignment.planId === effectivePlan.id &&
          ((assignment.pattern === "WEEKDAY" &&
            assignment.weekday === getIsoWeekday(date)) ||
            (assignment.pattern === "DATE" &&
              assignment.assignmentDate === date)),
      )
      .sort(
        (left, right) =>
          left.startMinutes - right.startMinutes ||
          left.id.localeCompare(right.id),
      );

    matchingAssignments.forEach((assignment, index) => {
      results.push({
        id: `${date}-${index + 1}`,
        date,
        dayLabel: getDayLabel(date, today),
        time: `${formatMinutes(assignment.startMinutes)} — ${formatMinutes(assignment.endMinutes)}`,
        tutor: assignment.tutorName,
        modality: SCHEDULE_MODALITY_LABELS[assignment.modality],
      });
    });
  }

  return results;
}

export async function getAdminOverviewReadModel(
  db: Database,
  now = getServerNow(),
): Promise<AdminOverviewReadModel> {
  const currentDate = getAdminOverviewCurrentDate(now);
  const cycle = await getCurrentAdministrativeCycle(db);

  if (cycle === null) {
    return { currentDate, cycle: null };
  }

  const results = await Promise.allSettled([
    getNegativeBalanceCount(db, cycle.id),
    getConsultationReviewCount(db),
    getConsultationSourceHealth(db),
    getUpcomingDuties(db, cycle, currentDate),
  ]);

  return {
    currentDate,
    cycle,
    negativeBalances: settle(results[0]),
    consultationReviews: settle(results[1]),
    consultationSource: settle(results[2]),
    upcomingDuties: settle(results[3]),
  };
}
