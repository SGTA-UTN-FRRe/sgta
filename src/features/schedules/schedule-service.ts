import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  gte,
  gt,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit-core";
import type { Database } from "@/db/client-core";
import {
  administrativeCycle,
  dutyOccurrence,
  scheduleAssignment,
  schedulePlan,
  tutor,
  tutorCycleMembership,
  user,
  type AdministrativeCycleStatus,
  type RecordStatus,
  type ScheduleAssignmentKind,
  type ScheduleAssignmentPattern,
  type SchedulePlanKind,
} from "@/db/schema";

import {
  assignmentWindowsOverlap,
  createScheduleAssignmentInputSchema,
  createSchedulePlanInputSchema,
  effectiveScheduleInputSchema,
  getIsoWeekday,
  scheduleAssignmentListInputSchema,
  scheduleAssignmentStatusInputSchema,
  scheduleIdentifierSchema,
  schedulePlanListInputSchema,
  schedulePlanStatusInputSchema,
  updateScheduleAssignmentInputSchema,
  updateSchedulePlanInputSchema,
  type ParsedCreateScheduleAssignmentInput,
  type ParsedEffectiveScheduleInput,
  type ParsedScheduleAssignmentStatusInput,
  type ParsedSchedulePlanStatusInput,
  type ParsedUpdateScheduleAssignmentInput,
} from "./schedule-validation";

export const SCHEDULE_ERROR_CODES = {
  validationError: "validation_error",
  queryFailed: "query_failed",
  transactionFailed: "transaction_failed",
  actorRequired: "actor_required",
  actorNotFound: "actor_not_found",
  cycleNotFound: "cycle_not_found",
  cycleNotOpen: "cycle_not_open",
  dateOutsideCycle: "date_outside_cycle",
  planNotFound: "plan_not_found",
  planValidityOutsideCycle: "plan_validity_outside_cycle",
  planHasOccurrences: "plan_has_occurrences",
  regularPlanConflict: "regular_plan_conflict",
  specialPlanOverlap: "special_plan_overlap",
  assignmentNotFound: "assignment_not_found",
  assignmentDateOutsidePlan: "assignment_date_outside_plan",
  tutorNotFound: "tutor_not_found",
  inactiveTutor: "inactive_tutor",
  tutorNotInCycle: "tutor_not_in_cycle",
  assignmentConflict: "assignment_conflict",
  statusAlreadySet: "status_already_set",
  occurrenceCreationFailed: "occurrence_creation_failed",
} as const;

export type ScheduleServiceErrorCode =
  (typeof SCHEDULE_ERROR_CODES)[keyof typeof SCHEDULE_ERROR_CODES];

export type ScheduleValidationIssue = {
  code: string;
  path: Array<string | number>;
  message: string;
};

export type ScheduleServiceErrorDetails = Record<
  string,
  string | number | null | string[]
>;

export class ScheduleServiceError extends Error {
  readonly code: ScheduleServiceErrorCode;
  readonly details?: ScheduleServiceErrorDetails;
  readonly issues?: ScheduleValidationIssue[];

  constructor(
    code: ScheduleServiceErrorCode,
    message: string,
    options: {
      details?: ScheduleServiceErrorDetails;
      issues?: ScheduleValidationIssue[];
    } = {},
  ) {
    super(message);
    this.name = "ScheduleServiceError";
    this.code = code;
    this.details = options.details;
    this.issues = options.issues;
  }
}

export type ScheduleMutationContext = {
  actorId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
};

export type SafeScheduleCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
};

export type SafeSchedulePlan = {
  id: string;
  cycleId: string;
  name: string;
  kind: SchedulePlanKind;
  validFrom: string;
  validTo: string;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type SafeScheduleAssignment = {
  id: string;
  planId: string;
  tutorId: string;
  tutorName: string;
  pattern: ScheduleAssignmentPattern;
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
  kind: ScheduleAssignmentKind;
  modality: string | null;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type SafeRecoveryContext = {
  markedForRecovery: boolean;
  recognition: "EXPLICIT_ACTION_REQUIRED" | "NOT_APPLICABLE";
};

export type SafeDutyOccurrence = {
  id: string;
  cycleId: string;
  planId: string;
  assignmentId: string;
  tutorId: string;
  occurrenceDate: string;
  startMinutes: number;
  endMinutes: number;
  kind: ScheduleAssignmentKind;
  modality: string | null;
  recovery: SafeRecoveryContext;
  createdAt: string;
};

export type SafeEffectiveSchedule = {
  cycle: SafeScheduleCycle;
  plan: SafeSchedulePlan | null;
  occurrences: SafeDutyOccurrence[];
};

type SelectDatabase = Pick<Database, "select">;
export type ScheduleMutationDatabase = Pick<
  Database,
  "select" | "insert" | "update" | "execute"
>;
type MutationDatabase = ScheduleMutationDatabase;

type CycleRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
};

type PlanRow = {
  id: string;
  cycleId: string;
  name: string;
  kind: SchedulePlanKind;
  validFrom: string;
  validTo: string;
  status: RecordStatus;
  createdAt: Date;
  updatedAt: Date;
};

type AssignmentRow = {
  id: string;
  planId: string;
  tutorId: string;
  tutorName: string;
  pattern: ScheduleAssignmentPattern;
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
  kind: ScheduleAssignmentKind;
  modality: string | null;
  status: RecordStatus;
  createdAt: Date;
  updatedAt: Date;
};

type OccurrenceRow = {
  id: string;
  cycleId: string;
  planId: string;
  assignmentId: string;
  tutorId: string;
  occurrenceDate: string;
  startMinutes: number;
  endMinutes: number;
  kind: ScheduleAssignmentKind;
  modality: string | null;
  createdAt: Date;
};

const cycleSelection = {
  id: administrativeCycle.id,
  name: administrativeCycle.name,
  startDate: administrativeCycle.startDate,
  endDate: administrativeCycle.endDate,
  status: administrativeCycle.status,
};

const planSelection = {
  id: schedulePlan.id,
  cycleId: schedulePlan.cycleId,
  name: schedulePlan.name,
  kind: schedulePlan.kind,
  validFrom: schedulePlan.validFrom,
  validTo: schedulePlan.validTo,
  status: schedulePlan.status,
  createdAt: schedulePlan.createdAt,
  updatedAt: schedulePlan.updatedAt,
};

const assignmentSelection = {
  id: scheduleAssignment.id,
  planId: scheduleAssignment.planId,
  tutorId: scheduleAssignment.tutorId,
  tutorName: sql<string>`concat(${tutor.lastName}, ', ', ${tutor.firstName})`,
  pattern: scheduleAssignment.pattern,
  weekday: scheduleAssignment.weekday,
  assignmentDate: scheduleAssignment.assignmentDate,
  startMinutes: scheduleAssignment.startMinutes,
  endMinutes: scheduleAssignment.endMinutes,
  kind: scheduleAssignment.kind,
  modality: scheduleAssignment.modality,
  status: scheduleAssignment.status,
  createdAt: scheduleAssignment.createdAt,
  updatedAt: scheduleAssignment.updatedAt,
};

const occurrenceSelection = {
  id: dutyOccurrence.id,
  cycleId: dutyOccurrence.cycleId,
  planId: dutyOccurrence.planId,
  assignmentId: dutyOccurrence.assignmentId,
  tutorId: dutyOccurrence.tutorId,
  occurrenceDate: dutyOccurrence.occurrenceDate,
  startMinutes: dutyOccurrence.startMinutes,
  endMinutes: dutyOccurrence.endMinutes,
  kind: dutyOccurrence.kind,
  modality: dutyOccurrence.modality,
  createdAt: dutyOccurrence.createdAt,
};

function toIso(value: Date) {
  return value.toISOString();
}

function toSafeCycle(row: CycleRow): SafeScheduleCycle {
  return { ...row };
}

function toSafePlan(row: PlanRow): SafeSchedulePlan {
  return {
    id: row.id,
    cycleId: row.cycleId,
    name: row.name,
    kind: row.kind,
    validFrom: row.validFrom,
    validTo: row.validTo,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toSafeAssignment(row: AssignmentRow): SafeScheduleAssignment {
  return {
    id: row.id,
    planId: row.planId,
    tutorId: row.tutorId,
    tutorName: row.tutorName,
    pattern: row.pattern,
    weekday: row.weekday,
    assignmentDate: row.assignmentDate,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    kind: row.kind,
    modality: row.modality,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toSafeOccurrence(row: OccurrenceRow): SafeDutyOccurrence {
  const markedForRecovery = row.kind === "RECOVERY";

  return {
    id: row.id,
    cycleId: row.cycleId,
    planId: row.planId,
    assignmentId: row.assignmentId,
    tutorId: row.tutorId,
    occurrenceDate: row.occurrenceDate,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    kind: row.kind,
    modality: row.modality,
    recovery: {
      markedForRecovery,
      recognition: markedForRecovery
        ? "EXPLICIT_ACTION_REQUIRED"
        : "NOT_APPLICABLE",
    },
    createdAt: toIso(row.createdAt),
  };
}

function getDatabaseErrorProperty(
  error: unknown,
  property: "code" | "constraint",
) {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[property];
  return typeof value === "string" ? value : undefined;
}

function getDatabaseErrorInfo(error: unknown) {
  let current: unknown = error;

  for (let depth = 0; depth < 3; depth += 1) {
    if (current === null || typeof current !== "object") {
      break;
    }

    const code = getDatabaseErrorProperty(current, "code");
    const constraint = getDatabaseErrorProperty(current, "constraint");

    if (code !== undefined || constraint !== undefined) {
      return { code, constraint };
    }

    current = (current as { cause?: unknown }).cause;
  }

  return { code: undefined, constraint: undefined };
}

export function mapScheduleMutationError(error: unknown): ScheduleServiceError {
  if (error instanceof ScheduleServiceError) {
    return error;
  }

  const { code, constraint } = getDatabaseErrorInfo(error);
  const constraintName = constraint ?? "";

  if (code === "23505") {
    if (constraintName.includes("schedule_plan_active_regular")) {
      return new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.regularPlanConflict,
        "An active regular plan already exists for this cycle.",
      );
    }

    if (constraintName.includes("duty_occurrence_assignment_date")) {
      return new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.occurrenceCreationFailed,
        "The duty occurrence already exists for this assignment and date.",
      );
    }
  }

  if (code === "23503") {
    return new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.transactionFailed,
      "The schedule operation references data that is no longer available.",
    );
  }

  if (code === "23514" || code === "22P02") {
    return new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.validationError,
      "The schedule operation contains an invalid value.",
    );
  }

  return new ScheduleServiceError(
    SCHEDULE_ERROR_CODES.transactionFailed,
    "The schedule operation could not be completed.",
  );
}

function createValidationError(error: z.ZodError) {
  return new ScheduleServiceError(
    SCHEDULE_ERROR_CODES.validationError,
    "The schedule input is invalid.",
    {
      issues: error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.filter(
          (segment): segment is string | number =>
            typeof segment === "string" || typeof segment === "number",
        ),
        message: issue.message,
      })),
    },
  );
}

function parseServiceInput<T>(schema: z.ZodType<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }

    throw error;
  }
}

function parseIdentifier(value: string, field: string) {
  try {
    return scheduleIdentifierSchema.parse(value);
  } catch {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.validationError,
      "The schedule identifier is invalid.",
      { details: { field } },
    );
  }
}

async function runMutation<T>(
  db: Database,
  operation: (transaction: MutationDatabase) => Promise<T>,
) {
  try {
    return await db.transaction((transaction) => operation(transaction));
  } catch (error) {
    throw mapScheduleMutationError(error);
  }
}

async function runQuery<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ScheduleServiceError) {
      throw error;
    }

    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.queryFailed,
      "The schedule data could not be loaded.",
    );
  }
}

async function requireActor(
  db: SelectDatabase,
  actorId: string | null | undefined,
) {
  const normalizedActorId = actorId?.trim();

  if (normalizedActorId === undefined || normalizedActorId.length === 0) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.actorRequired,
      "An authenticated actor is required for schedule changes.",
    );
  }

  const [actor] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, normalizedActorId))
    .limit(1);

  if (actor === undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.actorNotFound,
      "The audit actor was not found.",
      { details: { actorId: normalizedActorId } },
    );
  }

  return actor;
}

function assertActorProvided(actorId: string | null | undefined) {
  if (actorId?.trim() === undefined || actorId.trim().length === 0) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.actorRequired,
      "An authenticated actor is required for schedule changes.",
    );
  }
}

async function getCycle(
  db: SelectDatabase,
  cycleId: string,
): Promise<CycleRow | undefined> {
  const [row] = await db
    .select(cycleSelection)
    .from(administrativeCycle)
    .where(eq(administrativeCycle.id, cycleId))
    .limit(1);

  return row;
}

async function requireCycle(
  db: SelectDatabase,
  cycleId: string,
): Promise<CycleRow> {
  const cycle = await getCycle(db, cycleId);

  if (cycle === undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.cycleNotFound,
      "The administrative cycle was not found.",
      { details: { cycleId } },
    );
  }

  return cycle;
}

async function requireOpenCycle(
  db: MutationDatabase,
  cycleId: string,
  lock = false,
): Promise<CycleRow> {
  if (lock) {
    await db.execute(
      sql`SELECT id FROM "administrative_cycle" WHERE id = ${cycleId} FOR UPDATE`,
    );
  }

  const cycle = await requireCycle(db, cycleId);

  if (cycle.status !== "OPEN") {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.cycleNotOpen,
      "The administrative cycle is not open.",
      { details: { cycleId } },
    );
  }

  return cycle;
}

function assertDateWithinCycle(date: string, cycle: CycleRow) {
  if (date < cycle.startDate || date > cycle.endDate) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.dateOutsideCycle,
      "The requested date must fall within the administrative cycle.",
      {
        details: {
          date,
          cycleStartDate: cycle.startDate,
          cycleEndDate: cycle.endDate,
        },
      },
    );
  }
}

function assertPlanValidityWithinCycle(
  validFrom: string,
  validTo: string,
  cycle: CycleRow,
) {
  if (
    validFrom < cycle.startDate ||
    validTo > cycle.endDate ||
    validFrom > validTo
  ) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.planValidityOutsideCycle,
      "The plan validity must be contained within the administrative cycle.",
      {
        details: {
          validFrom,
          validTo,
          cycleStartDate: cycle.startDate,
          cycleEndDate: cycle.endDate,
        },
      },
    );
  }
}

async function getPlan(
  db: SelectDatabase,
  planId: string,
): Promise<PlanRow | undefined> {
  const [row] = await db
    .select(planSelection)
    .from(schedulePlan)
    .where(eq(schedulePlan.id, planId))
    .limit(1);

  return row;
}

async function requirePlan(
  db: SelectDatabase,
  planId: string,
): Promise<PlanRow> {
  const plan = await getPlan(db, planId);

  if (plan === undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.planNotFound,
      "The schedule plan was not found.",
      { details: { planId } },
    );
  }

  return plan;
}

async function requirePlanForWrite(
  db: MutationDatabase,
  planId: string,
): Promise<{ plan: PlanRow; cycle: CycleRow }> {
  const initialPlan = await requirePlan(db, planId);
  const cycle = await requireOpenCycle(db, initialPlan.cycleId, true);
  const plan = await requirePlan(db, planId);

  return { plan, cycle };
}

async function findActiveSpecialOverlaps(
  db: SelectDatabase,
  cycleId: string,
  validFrom: string,
  validTo: string,
  excludedPlanId?: string,
) {
  return db
    .select({
      id: schedulePlan.id,
      validFrom: schedulePlan.validFrom,
      validTo: schedulePlan.validTo,
    })
    .from(schedulePlan)
    .where(
      and(
        eq(schedulePlan.cycleId, cycleId),
        eq(schedulePlan.kind, "SPECIAL"),
        eq(schedulePlan.status, "ACTIVE"),
        lte(schedulePlan.validFrom, validTo),
        gte(schedulePlan.validTo, validFrom),
        excludedPlanId === undefined
          ? undefined
          : ne(schedulePlan.id, excludedPlanId),
      ),
    )
    .orderBy(asc(schedulePlan.validFrom), asc(schedulePlan.id));
}

async function assertPlanCanBeActive(
  db: SelectDatabase,
  plan: Pick<PlanRow, "id" | "cycleId" | "kind" | "validFrom" | "validTo">,
) {
  if (plan.kind === "REGULAR") {
    const [activeRegular] = await db
      .select({ id: schedulePlan.id })
      .from(schedulePlan)
      .where(
        and(
          eq(schedulePlan.cycleId, plan.cycleId),
          eq(schedulePlan.kind, "REGULAR"),
          eq(schedulePlan.status, "ACTIVE"),
          ne(schedulePlan.id, plan.id),
        ),
      )
      .limit(1);

    if (activeRegular !== undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.regularPlanConflict,
        "An active regular plan already exists for this cycle.",
        { details: { cycleId: plan.cycleId, planId: activeRegular.id } },
      );
    }

    return;
  }

  const overlaps = await findActiveSpecialOverlaps(
    db,
    plan.cycleId,
    plan.validFrom,
    plan.validTo,
    plan.id,
  );

  if (overlaps.length > 0) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.specialPlanOverlap,
      "The special plan validity overlaps another active special plan.",
      {
        details: {
          cycleId: plan.cycleId,
          planId: overlaps[0]!.id,
          conflictingPlanIds: overlaps.map((overlap) => overlap.id),
          validFrom: plan.validFrom,
          validTo: plan.validTo,
        },
      },
    );
  }
}

async function assertPlanHasNoHistoricalOccurrences(
  db: SelectDatabase,
  planId: string,
  validFrom: string,
  validTo: string,
) {
  const [occurrence] = await db
    .select({ id: dutyOccurrence.id, occurrenceDate: dutyOccurrence.occurrenceDate })
    .from(dutyOccurrence)
    .where(
      and(
        eq(dutyOccurrence.planId, planId),
        or(
          lt(dutyOccurrence.occurrenceDate, validFrom),
          gt(dutyOccurrence.occurrenceDate, validTo),
        ),
      ),
    )
    .limit(1);

  if (occurrence !== undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.planHasOccurrences,
      "The plan validity cannot exclude a recorded duty occurrence.",
      {
        details: {
          planId,
          occurrenceId: occurrence.id,
          occurrenceDate: occurrence.occurrenceDate,
        },
      },
    );
  }
}

async function requireEligibleTutor(
  db: SelectDatabase,
  tutorId: string,
  cycleId: string,
) {
  const [tutorRecord] = await db
    .select({ id: tutor.id, status: tutor.status })
    .from(tutor)
    .where(eq(tutor.id, tutorId))
    .limit(1);

  if (tutorRecord === undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.tutorNotFound,
      "The tutor was not found.",
      { details: { tutorId } },
    );
  }

  if (tutorRecord.status !== "ACTIVE") {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.inactiveTutor,
      "The selected tutor is inactive.",
      { details: { tutorId } },
    );
  }

  const [membership] = await db
    .select({ tutorId: tutorCycleMembership.tutorId })
    .from(tutorCycleMembership)
    .where(
      and(
        eq(tutorCycleMembership.tutorId, tutorId),
        eq(tutorCycleMembership.cycleId, cycleId),
      ),
    )
    .limit(1);

  if (membership === undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.tutorNotInCycle,
      "The tutor is not a member of this administrative cycle.",
      { details: { tutorId, cycleId } },
    );
  }
}

function assertAssignmentDateWithinPlan(
  assignmentDate: string | null,
  plan: Pick<PlanRow, "id" | "validFrom" | "validTo">,
) {
  if (
    assignmentDate !== null &&
    (assignmentDate < plan.validFrom || assignmentDate > plan.validTo)
  ) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.assignmentDateOutsidePlan,
      "The assignment date must fall within the plan validity.",
      {
        details: {
          planId: plan.id,
          assignmentDate,
          validFrom: plan.validFrom,
          validTo: plan.validTo,
        },
      },
    );
  }
}

function toAssignmentWindow(row: {
  pattern: ScheduleAssignmentPattern;
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
}) {
  return {
    pattern: row.pattern,
    weekday: row.weekday,
    assignmentDate: row.assignmentDate,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
  } as const;
}

type AssignmentConflictCandidate = {
  tutorId: string;
  pattern: ScheduleAssignmentPattern;
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
  status: RecordStatus;
};

async function findAssignmentConflicts(
  db: SelectDatabase,
  plan: Pick<PlanRow, "id" | "validFrom" | "validTo">,
  candidate: Omit<AssignmentConflictCandidate, "status">,
  excludedAssignmentId?: string,
) {
  const assignments = await db
    .select({
      id: scheduleAssignment.id,
      pattern: scheduleAssignment.pattern,
      weekday: scheduleAssignment.weekday,
      assignmentDate: scheduleAssignment.assignmentDate,
      startMinutes: scheduleAssignment.startMinutes,
      endMinutes: scheduleAssignment.endMinutes,
    })
    .from(scheduleAssignment)
    .where(
      and(
        eq(scheduleAssignment.planId, plan.id),
        eq(scheduleAssignment.tutorId, candidate.tutorId),
        eq(scheduleAssignment.status, "ACTIVE"),
        excludedAssignmentId === undefined
          ? undefined
          : ne(scheduleAssignment.id, excludedAssignmentId),
      ),
    )
    .orderBy(asc(scheduleAssignment.id));

  const candidateWindow = toAssignmentWindow(candidate);

  return assignments.filter((assignment) =>
    assignmentWindowsOverlap(
      candidateWindow,
      toAssignmentWindow(assignment),
      plan.validFrom,
      plan.validTo,
    ),
  );
}

async function assertNoAssignmentConflicts(
  db: SelectDatabase,
  plan: Pick<PlanRow, "id" | "validFrom" | "validTo">,
  candidate: AssignmentConflictCandidate,
  excludedAssignmentId?: string,
) {
  if (candidate.status === "INACTIVE") {
    return;
  }

  const conflicts = await findAssignmentConflicts(
    db,
    plan,
    candidate,
    excludedAssignmentId,
  );

  if (conflicts.length > 0) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.assignmentConflict,
      "The tutor already has an overlapping effective assignment.",
      {
        details: {
          planId: plan.id,
          tutorId: candidate.tutorId,
          conflictingAssignmentIds: conflicts.map((conflict) => conflict.id),
          assignmentDate: candidate.assignmentDate,
        },
      },
    );
  }
}

async function getAssignment(
  db: SelectDatabase,
  assignmentId: string,
): Promise<AssignmentRow | undefined> {
  const [row] = await db
    .select(assignmentSelection)
    .from(scheduleAssignment)
    .innerJoin(tutor, eq(scheduleAssignment.tutorId, tutor.id))
    .where(eq(scheduleAssignment.id, assignmentId))
    .limit(1);

  return row;
}

async function requireAssignment(
  db: SelectDatabase,
  assignmentId: string,
): Promise<AssignmentRow> {
  const assignment = await getAssignment(db, assignmentId);

  if (assignment === undefined) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.assignmentNotFound,
      "The schedule assignment was not found.",
      { details: { assignmentId } },
    );
  }

  return assignment;
}

async function findEffectivePlan(
  db: SelectDatabase,
  cycleId: string,
  date: string,
) {
  const specialPlans = await db
    .select(planSelection)
    .from(schedulePlan)
    .where(
      and(
        eq(schedulePlan.cycleId, cycleId),
        eq(schedulePlan.kind, "SPECIAL"),
        eq(schedulePlan.status, "ACTIVE"),
        lte(schedulePlan.validFrom, date),
        gte(schedulePlan.validTo, date),
      ),
    )
    .orderBy(asc(schedulePlan.validFrom), asc(schedulePlan.id));

  if (specialPlans.length > 1) {
    throw new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.specialPlanOverlap,
      "More than one active special plan applies to the requested date.",
      {
        details: {
          cycleId,
          date,
          conflictingPlanIds: specialPlans.map((plan) => plan.id),
        },
      },
    );
  }

  if (specialPlans[0] !== undefined) {
    return specialPlans[0];
  }

  const [regularPlan] = await db
    .select(planSelection)
    .from(schedulePlan)
    .where(
      and(
        eq(schedulePlan.cycleId, cycleId),
        eq(schedulePlan.kind, "REGULAR"),
        eq(schedulePlan.status, "ACTIVE"),
        lte(schedulePlan.validFrom, date),
        gte(schedulePlan.validTo, date),
      ),
    )
    .orderBy(desc(schedulePlan.updatedAt), asc(schedulePlan.id))
    .limit(1);

  return regularPlan;
}

async function getOccurrenceRows(
  db: SelectDatabase,
  assignmentIds: string[],
  date: string,
) {
  if (assignmentIds.length === 0) {
    return [] as OccurrenceRow[];
  }

  return db
    .select(occurrenceSelection)
    .from(dutyOccurrence)
    .where(
      and(
        inArray(dutyOccurrence.assignmentId, assignmentIds),
        eq(dutyOccurrence.occurrenceDate, date),
      ),
    )
    .orderBy(asc(dutyOccurrence.startMinutes), asc(dutyOccurrence.id));
}

async function lockAssignments(
  db: MutationDatabase,
  assignmentIds: string[],
) {
  if (assignmentIds.length === 0) {
    return;
  }

  await db.execute(
    sql`SELECT id FROM "schedule_assignment" WHERE id IN (${sql.join(
      assignmentIds.map((id) => sql`${id}`),
      sql`, `,
    )}) FOR UPDATE`,
  );
}

async function materializeEffectiveSchedule(
  db: MutationDatabase,
  input: ParsedEffectiveScheduleInput,
  context: ScheduleMutationContext,
): Promise<SafeEffectiveSchedule> {
  const actor = await requireActor(db, context.actorId);
  const cycle = await requireOpenCycle(db, input.cycleId, true);
  assertDateWithinCycle(input.date, cycle);

  const effectivePlan = await findEffectivePlan(db, input.cycleId, input.date);
  if (effectivePlan === undefined) {
    return {
      cycle: toSafeCycle(cycle),
      plan: null,
      occurrences: [],
    };
  }

  const weekday = getIsoWeekday(input.date);
  const assignments = await db
    .select({
      id: scheduleAssignment.id,
      tutorId: scheduleAssignment.tutorId,
      pattern: scheduleAssignment.pattern,
      weekday: scheduleAssignment.weekday,
      assignmentDate: scheduleAssignment.assignmentDate,
      startMinutes: scheduleAssignment.startMinutes,
      endMinutes: scheduleAssignment.endMinutes,
      kind: scheduleAssignment.kind,
      modality: scheduleAssignment.modality,
    })
    .from(scheduleAssignment)
    .where(
      and(
        eq(scheduleAssignment.planId, effectivePlan.id),
        eq(scheduleAssignment.status, "ACTIVE"),
        or(
          and(
            eq(scheduleAssignment.pattern, "WEEKDAY"),
            eq(scheduleAssignment.weekday, weekday),
          ),
          and(
            eq(scheduleAssignment.pattern, "DATE"),
            eq(scheduleAssignment.assignmentDate, input.date),
          ),
        ),
      ),
    )
    .orderBy(asc(scheduleAssignment.startMinutes), asc(scheduleAssignment.id));

  await lockAssignments(
    db,
    assignments.map((assignment) => assignment.id),
  );

  const existingOccurrences = await getOccurrenceRows(
    db,
    assignments.map((assignment) => assignment.id),
    input.date,
  );
  const existingByAssignmentId = new Map(
    existingOccurrences.map((occurrence) => [occurrence.assignmentId, occurrence]),
  );

  const createdOccurrences: OccurrenceRow[] = [];
  for (const assignment of assignments) {
    if (existingByAssignmentId.has(assignment.id)) {
      continue;
    }

    const [created] = await db
      .insert(dutyOccurrence)
      .values({
        cycleId: input.cycleId,
        planId: effectivePlan.id,
        assignmentId: assignment.id,
        tutorId: assignment.tutorId,
        occurrenceDate: input.date,
        startMinutes: assignment.startMinutes,
        endMinutes: assignment.endMinutes,
        kind: assignment.kind,
        modality: assignment.modality,
      })
      .returning(occurrenceSelection);

    if (created === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.occurrenceCreationFailed,
        "The duty occurrence could not be persisted.",
        { details: { assignmentId: assignment.id, date: input.date } },
      );
    }

    createdOccurrences.push(created);

    await recordAuditEvent(db, {
      actorId: actor.id,
      action: "schedule_occurrence.created",
      entityType: "duty_occurrence",
      entityId: created.id,
      metadata: {
        cycleId: input.cycleId,
        planId: effectivePlan.id,
        assignmentId: assignment.id,
        occurrenceDate: input.date,
        kind: assignment.kind,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });
  }

  const occurrences = assignments
    .map((assignment) => existingByAssignmentId.get(assignment.id) ??
      createdOccurrences.find((occurrence) => occurrence.assignmentId === assignment.id))
    .filter((occurrence): occurrence is OccurrenceRow => occurrence !== undefined)
    .sort(
      (left, right) =>
        left.startMinutes - right.startMinutes || left.id.localeCompare(right.id),
    );

  return {
    cycle: toSafeCycle(cycle),
    plan: toSafePlan(effectivePlan),
    occurrences: occurrences.map(toSafeOccurrence),
  };
}

export function parseCreateSchedulePlanInput(input: unknown) {
  return parseServiceInput(createSchedulePlanInputSchema, input);
}

export function parseUpdateSchedulePlanInput(input: unknown) {
  return parseServiceInput(updateSchedulePlanInputSchema, input);
}

export function parseSchedulePlanStatusInput(input: unknown) {
  return parseServiceInput(schedulePlanStatusInputSchema, input);
}

export function parseCreateScheduleAssignmentInput(input: unknown) {
  return parseServiceInput(createScheduleAssignmentInputSchema, input);
}

export function parseUpdateScheduleAssignmentInput(input: unknown) {
  return parseServiceInput(updateScheduleAssignmentInputSchema, input);
}

export function parseScheduleAssignmentStatusInput(input: unknown) {
  return parseServiceInput(scheduleAssignmentStatusInputSchema, input);
}

export function parseEffectiveScheduleInput(input: unknown) {
  return parseServiceInput(effectiveScheduleInputSchema, input);
}

export async function listSchedulePlans(
  db: Database,
  input: unknown,
): Promise<SafeSchedulePlan[]> {
  const parsed = parseServiceInput(schedulePlanListInputSchema, input);

  return runQuery(async () => {
    await requireCycle(db, parsed.cycleId);

    const conditions = [eq(schedulePlan.cycleId, parsed.cycleId)];
    if (parsed.status !== undefined) {
      conditions.push(eq(schedulePlan.status, parsed.status));
    }

    const rows = await db
      .select(planSelection)
      .from(schedulePlan)
      .where(and(...conditions))
      .orderBy(asc(schedulePlan.kind), asc(schedulePlan.validFrom), asc(schedulePlan.name));

    return rows.map(toSafePlan);
  });
}

export async function getSchedulePlan(
  db: Database,
  planId: string,
): Promise<SafeSchedulePlan> {
  const parsedPlanId = parseIdentifier(planId, "planId");

  return runQuery(async () => toSafePlan(await requirePlan(db, parsedPlanId)));
}

export async function createSchedulePlan(
  db: Database,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeSchedulePlan> {
  const parsed = parseCreateSchedulePlanInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const cycle = await requireOpenCycle(transaction, parsed.cycleId, true);
    assertPlanValidityWithinCycle(parsed.validFrom, parsed.validTo, cycle);

    const candidate = {
      id: "00000000-0000-4000-8000-000000000000",
      cycleId: parsed.cycleId,
      kind: parsed.kind,
      validFrom: parsed.validFrom,
      validTo: parsed.validTo,
    } as const;

    if (parsed.status === "ACTIVE") {
      await assertPlanCanBeActive(transaction, candidate);
    }

    const [created] = await transaction
      .insert(schedulePlan)
      .values({
        cycleId: parsed.cycleId,
        name: parsed.name,
        kind: parsed.kind,
        validFrom: parsed.validFrom,
        validTo: parsed.validTo,
        status: parsed.status,
      })
      .returning(planSelection);

    if (created === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.transactionFailed,
        "The schedule plan could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "schedule_plan.created",
      entityType: "schedule_plan",
      entityId: created.id,
      metadata: {
        cycleId: created.cycleId,
        kind: created.kind,
        validFrom: created.validFrom,
        validTo: created.validTo,
        status: created.status,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafePlan(created);
  });
}

export async function updateSchedulePlan(
  db: Database,
  planId: string,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeSchedulePlan> {
  const parsedPlanId = parseIdentifier(planId, "planId");
  const parsed = parseUpdateSchedulePlanInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const { plan: existing, cycle } = await requirePlanForWrite(
      transaction,
      parsedPlanId,
    );
    const validFrom = parsed.validFrom ?? existing.validFrom;
    const validTo = parsed.validTo ?? existing.validTo;
    assertPlanValidityWithinCycle(validFrom, validTo, cycle);
    await assertPlanHasNoHistoricalOccurrences(
      transaction,
      existing.id,
      validFrom,
      validTo,
    );

    const candidate = {
      id: existing.id,
      cycleId: existing.cycleId,
      kind: existing.kind,
      validFrom,
      validTo,
    };
    if (existing.status === "ACTIVE") {
      await assertPlanCanBeActive(transaction, candidate);
    }

    const changedFields: string[] = [];
    if (parsed.name !== undefined && parsed.name !== existing.name) {
      changedFields.push("name");
    }
    if (validFrom !== existing.validFrom) {
      changedFields.push("validFrom");
    }
    if (validTo !== existing.validTo) {
      changedFields.push("validTo");
    }

    const [updated] = await transaction
      .update(schedulePlan)
      .set({
        ...(parsed.name === undefined ? {} : { name: parsed.name }),
        validFrom,
        validTo,
        updatedAt: new Date(),
      })
      .where(eq(schedulePlan.id, existing.id))
      .returning(planSelection);

    if (updated === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.planNotFound,
        "The schedule plan was not found.",
        { details: { planId: existing.id } },
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "schedule_plan.updated",
      entityType: "schedule_plan",
      entityId: updated.id,
      metadata: { changedFields },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafePlan(updated);
  });
}

export async function transitionSchedulePlanStatus(
  db: Database,
  planId: string,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeSchedulePlan> {
  const parsedPlanId = parseIdentifier(planId, "planId");
  const parsed: ParsedSchedulePlanStatusInput = parseSchedulePlanStatusInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const { plan: existing } = await requirePlanForWrite(transaction, parsedPlanId);

    if (existing.status === parsed.status) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.statusAlreadySet,
        "The schedule plan already has the requested status.",
        { details: { planId: existing.id, status: parsed.status } },
      );
    }

    if (parsed.status === "ACTIVE") {
      await assertPlanCanBeActive(transaction, existing);
    }

    const [updated] = await transaction
      .update(schedulePlan)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(schedulePlan.id, existing.id))
      .returning(planSelection);

    if (updated === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.planNotFound,
        "The schedule plan was not found.",
        { details: { planId: existing.id } },
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "schedule_plan.status_changed",
      entityType: "schedule_plan",
      entityId: updated.id,
      metadata: {
        previousStatus: existing.status,
        status: updated.status,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafePlan(updated);
  });
}

export const setSchedulePlanStatus = transitionSchedulePlanStatus;

export async function resolveEffectivePlan(
  db: Database,
  input: unknown,
): Promise<SafeSchedulePlan | null> {
  const parsed = parseEffectiveScheduleInput(input);

  return runQuery(async () => {
    const cycle = await requireCycle(db, parsed.cycleId);
    assertDateWithinCycle(parsed.date, cycle);
    const plan = await findEffectivePlan(db, parsed.cycleId, parsed.date);

    return plan === undefined ? null : toSafePlan(plan);
  });
}

export async function listScheduleAssignments(
  db: Database,
  input: unknown,
): Promise<SafeScheduleAssignment[]> {
  const parsed = parseServiceInput(scheduleAssignmentListInputSchema, input);

  return runQuery(async () => {
    await requirePlan(db, parsed.planId);
    const conditions = [eq(scheduleAssignment.planId, parsed.planId)];
    if (parsed.status !== undefined) {
      conditions.push(eq(scheduleAssignment.status, parsed.status));
    }

    const rows = await db
      .select(assignmentSelection)
      .from(scheduleAssignment)
      .innerJoin(tutor, eq(scheduleAssignment.tutorId, tutor.id))
      .where(and(...conditions))
      .orderBy(
        asc(scheduleAssignment.status),
        asc(scheduleAssignment.assignmentDate),
        asc(scheduleAssignment.weekday),
        asc(scheduleAssignment.startMinutes),
      );

    return rows.map(toSafeAssignment);
  });
}

export async function createScheduleAssignment(
  db: Database,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeScheduleAssignment> {
  const parsed: ParsedCreateScheduleAssignmentInput =
    parseCreateScheduleAssignmentInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const { plan, cycle } = await requirePlanForWrite(transaction, parsed.planId);
    await requireEligibleTutor(transaction, parsed.tutorId, cycle.id);
    assertAssignmentDateWithinPlan(parsed.assignmentDate ?? null, plan);

    const candidate = {
      ...parsed,
      weekday: parsed.weekday ?? null,
      assignmentDate: parsed.assignmentDate ?? null,
      modality: parsed.modality ?? null,
      status: "ACTIVE" as const,
    };
    await assertNoAssignmentConflicts(transaction, plan, candidate);

    const [created] = await transaction
      .insert(scheduleAssignment)
      .values({
        planId: parsed.planId,
        tutorId: parsed.tutorId,
        pattern: parsed.pattern,
        weekday: parsed.weekday ?? null,
        assignmentDate: parsed.assignmentDate ?? null,
        startMinutes: parsed.startMinutes,
        endMinutes: parsed.endMinutes,
        kind: parsed.kind,
        modality: parsed.modality ?? null,
        status: "ACTIVE",
      })
      .returning({ id: scheduleAssignment.id });

    if (created === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.transactionFailed,
        "The schedule assignment could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "schedule_assignment.created",
      entityType: "schedule_assignment",
      entityId: created.id,
      metadata: {
        planId: parsed.planId,
        tutorId: parsed.tutorId,
        pattern: parsed.pattern,
        assignmentDate: parsed.assignmentDate ?? null,
        weekday: parsed.weekday ?? null,
        startMinutes: parsed.startMinutes,
        endMinutes: parsed.endMinutes,
        kind: parsed.kind,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafeAssignment(await requireAssignment(transaction, created.id));
  });
}

export async function updateScheduleAssignment(
  db: Database,
  assignmentId: string,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeScheduleAssignment> {
  const parsedAssignmentId = parseIdentifier(assignmentId, "assignmentId");
  const parsed: ParsedUpdateScheduleAssignmentInput =
    parseUpdateScheduleAssignmentInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const existing = await requireAssignment(transaction, parsedAssignmentId);
    const { plan, cycle } = await requirePlanForWrite(
      transaction,
      existing.planId,
    );
    const tutorId = parsed.tutorId ?? existing.tutorId;
    await requireEligibleTutor(transaction, tutorId, cycle.id);
    assertAssignmentDateWithinPlan(parsed.assignmentDate ?? null, plan);

    const candidate = {
      tutorId,
      pattern: parsed.pattern,
      weekday: parsed.weekday ?? null,
      assignmentDate: parsed.assignmentDate ?? null,
      startMinutes: parsed.startMinutes,
      endMinutes: parsed.endMinutes,
      status: existing.status,
    };
    await assertNoAssignmentConflicts(
      transaction,
      plan,
      candidate,
      existing.id,
    );

    const changedFields: string[] = [];
    if (tutorId !== existing.tutorId) changedFields.push("tutorId");
    if (candidate.pattern !== existing.pattern) changedFields.push("pattern");
    if (candidate.weekday !== existing.weekday) changedFields.push("weekday");
    if (candidate.assignmentDate !== existing.assignmentDate) {
      changedFields.push("assignmentDate");
    }
    if (candidate.startMinutes !== existing.startMinutes) {
      changedFields.push("startMinutes");
    }
    if (candidate.endMinutes !== existing.endMinutes) changedFields.push("endMinutes");
    if (parsed.kind !== existing.kind) changedFields.push("kind");
    if ((parsed.modality ?? null) !== existing.modality) changedFields.push("modality");

    const [updated] = await transaction
      .update(scheduleAssignment)
      .set({
        tutorId,
        pattern: parsed.pattern,
        weekday: parsed.weekday ?? null,
        assignmentDate: parsed.assignmentDate ?? null,
        startMinutes: parsed.startMinutes,
        endMinutes: parsed.endMinutes,
        kind: parsed.kind,
        modality: parsed.modality ?? null,
        updatedAt: new Date(),
      })
      .where(eq(scheduleAssignment.id, existing.id))
      .returning({ id: scheduleAssignment.id });

    if (updated === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.assignmentNotFound,
        "The schedule assignment was not found.",
        { details: { assignmentId: existing.id } },
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "schedule_assignment.updated",
      entityType: "schedule_assignment",
      entityId: updated.id,
      metadata: { changedFields, occurrenceHistoryPreserved: true },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafeAssignment(await requireAssignment(transaction, updated.id));
  });
}

export async function transitionScheduleAssignmentStatus(
  db: Database,
  assignmentId: string,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeScheduleAssignment> {
  const parsedAssignmentId = parseIdentifier(assignmentId, "assignmentId");
  const parsed: ParsedScheduleAssignmentStatusInput =
    parseScheduleAssignmentStatusInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const existing = await requireAssignment(transaction, parsedAssignmentId);
    const { plan, cycle } = await requirePlanForWrite(
      transaction,
      existing.planId,
    );

    if (existing.status === parsed.status) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.statusAlreadySet,
        "The schedule assignment already has the requested status.",
        { details: { assignmentId: existing.id, status: parsed.status } },
      );
    }

    await requireEligibleTutor(transaction, existing.tutorId, cycle.id);
    await assertNoAssignmentConflicts(
      transaction,
      plan,
      {
        tutorId: existing.tutorId,
        pattern: existing.pattern,
        weekday: existing.weekday,
        assignmentDate: existing.assignmentDate,
        startMinutes: existing.startMinutes,
        endMinutes: existing.endMinutes,
        status: parsed.status,
      },
      existing.id,
    );

    const [updated] = await transaction
      .update(scheduleAssignment)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(scheduleAssignment.id, existing.id))
      .returning({ id: scheduleAssignment.id });

    if (updated === undefined) {
      throw new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.assignmentNotFound,
        "The schedule assignment was not found.",
        { details: { assignmentId: existing.id } },
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "schedule_assignment.status_changed",
      entityType: "schedule_assignment",
      entityId: updated.id,
      metadata: { previousStatus: existing.status, status: parsed.status },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return toSafeAssignment(await requireAssignment(transaction, updated.id));
  });
}

export const setScheduleAssignmentStatus = transitionScheduleAssignmentStatus;

export async function resolveEffectiveSchedule(
  db: Database,
  input: unknown,
  context: ScheduleMutationContext = {},
): Promise<SafeEffectiveSchedule> {
  const parsed = parseEffectiveScheduleInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, (transaction) =>
    materializeEffectiveSchedule(transaction, parsed, context),
  );
}

export async function resolveEffectiveScheduleInTransaction(
  db: ScheduleMutationDatabase,
  input: ParsedEffectiveScheduleInput,
  context: ScheduleMutationContext,
): Promise<SafeEffectiveSchedule> {
  return materializeEffectiveSchedule(db, input, context);
}
