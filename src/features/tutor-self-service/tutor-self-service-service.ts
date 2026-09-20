import "server-only";

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "@/db/client-core";
import {
  administrativeCycle,
  career,
  hourCategory,
  hourMovement,
  scholarshipReference,
  scheduleAssignment,
  schedulePlan,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
  type ActivityKind,
  type AdministrativeCycleStatus,
  type HourMovementDirection,
  type RecordStatus,
  type ScheduleAssignmentKind,
  type ScheduleAssignmentPattern,
  type SchedulePlanKind,
} from "@/db/schema";
import {
  calculateSignedHourMinutes,
  deriveHourBalanceState,
} from "@/features/hours/hour-service";
import {
  dateOnlySchema,
  getIsoWeekday,
} from "@/features/schedules/schedule-validation";

import {
  applicationUserIdSchema,
  tutorSelfServiceHoursQuerySchema,
  tutorSelfServiceScheduleQuerySchema,
  type TutorSelfServiceHoursQuery,
  type TutorSelfServiceScheduleQuery,
} from "./tutor-self-service-validation";

export const TUTOR_SELF_SERVICE_ERROR_CODES = {
  validationError: "validation_error",
  queryFailed: "query_failed",
  ownerNotFound: "owner_not_found",
  ownerNotAllowed: "owner_not_allowed",
  dateOutsideCycle: "date_outside_cycle",
  specialPlanOverlap: "special_plan_overlap",
} as const;

export type TutorSelfServiceErrorCode =
  (typeof TUTOR_SELF_SERVICE_ERROR_CODES)[keyof typeof TUTOR_SELF_SERVICE_ERROR_CODES];

export type TutorSelfServiceValidationIssue = {
  code: string;
  path: Array<string | number>;
  message: string;
};

export class TutorSelfServiceError extends Error {
  readonly code: TutorSelfServiceErrorCode;
  readonly issues?: TutorSelfServiceValidationIssue[];

  constructor(
    code: TutorSelfServiceErrorCode,
    message: string,
    options: { issues?: TutorSelfServiceValidationIssue[] } = {},
  ) {
    super(message);
    this.name = "TutorSelfServiceError";
    this.code = code;
    this.issues = options.issues;
  }
}

export type TutorSelfServiceCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
};

export type TutorSelfServiceScholarshipReference = {
  id: string;
  type: string;
  knownRequiredHours: number | null;
  notes: string | null;
  status: RecordStatus;
};

export type TutorSelfServiceTutor = {
  displayName: string;
  career: {
    id: string;
    name: string;
    status: RecordStatus;
  };
  status: RecordStatus;
  subjects: Array<{
    id: string;
    name: string;
    status: RecordStatus;
  }>;
};

export type TutorSelfServiceCycleMembership = {
  cycleId: string;
  scholarshipReference: TutorSelfServiceScholarshipReference | null;
};

export type TutorSelfServiceRequiredActionReason =
  | "ACCOUNT_NOT_LINKED"
  | "OPEN_CYCLE_REQUIRED"
  | "CYCLE_MEMBERSHIP_REQUIRED";

export type TutorSelfServiceRequiredAction = {
  state: "required-action";
  reason: TutorSelfServiceRequiredActionReason;
  cycle?: TutorSelfServiceCycle;
};

export type TutorSelfServicePlan = {
  id: string;
  name: string;
  kind: SchedulePlanKind;
  validFrom: string;
  validTo: string;
  status: RecordStatus;
};

export type TutorSelfServiceScheduleAssignment = {
  id: string;
  planId: string;
  date: string;
  pattern: ScheduleAssignmentPattern;
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
  kind: ScheduleAssignmentKind;
  modality: string | null;
};

export type TutorSelfServiceScheduleDay = {
  date: string;
  weekday: number;
  plan: TutorSelfServicePlan | null;
  assignments: TutorSelfServiceScheduleAssignment[];
};

export type TutorSelfServiceSchedule =
  | TutorSelfServiceRequiredAction
  | {
      state: "ready";
      cycle: TutorSelfServiceCycle;
      window: {
        mode: "current" | "upcoming" | "selected";
        anchorDate: string;
        startDate: string;
        endDate: string;
      };
      effectivePlan: TutorSelfServicePlan | null;
      days: TutorSelfServiceScheduleDay[];
      nextDuty: TutorSelfServiceScheduleAssignment | null;
    }
  | {
      state: "empty-upcoming";
      cycle: TutorSelfServiceCycle;
      window: {
        mode: "empty-upcoming";
        anchorDate: null;
        startDate: null;
        endDate: null;
      };
      effectivePlan: null;
      days: TutorSelfServiceScheduleDay[];
      nextDuty: null;
    };

export type TutorSelfServiceMovement = {
  id: string;
  category: {
    id: string;
    name: string;
    activityKind: ActivityKind | null;
    status: RecordStatus;
  };
  direction: HourMovementDirection;
  durationMinutes: number;
  signedDurationMinutes: number;
  movementDate: string;
  note: string | null;
  reversalOfMovementId: string | null;
  reversalMovementId: string | null;
  reversalState: "CONFIRMED" | "REVERSED" | "REVERSAL";
  createdAt: string;
};

export type TutorSelfServiceHours =
  | TutorSelfServiceRequiredAction
  | {
      state: "ready";
      cycle: TutorSelfServiceCycle;
      balance: {
        signedBalanceMinutes: number;
        state: "current" | "owes";
      };
      movements: TutorSelfServiceMovement[];
      historyComplete: true;
    };

export type TutorSelfServiceSummary =
  | TutorSelfServiceRequiredAction
  | {
      state: "ready";
      cycle: TutorSelfServiceCycle;
      tutor: TutorSelfServiceTutor;
      membership: TutorSelfServiceCycleMembership;
      balance: {
        signedBalanceMinutes: number;
        state: "current" | "owes";
      };
      nextDuty: TutorSelfServiceScheduleAssignment | null;
    };

type SelectDatabase = Pick<Database, "select">;

type TutorSelfServiceReadOptions = {
  today?: string;
};

type CycleRow = TutorSelfServiceCycle;

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
  pattern: ScheduleAssignmentPattern;
  weekday: number | null;
  assignmentDate: string | null;
  startMinutes: number;
  endMinutes: number;
  kind: ScheduleAssignmentKind;
  modality: string | null;
};

type MovementRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryActivityKind: ActivityKind | null;
  categoryStatus: RecordStatus;
  direction: HourMovementDirection;
  durationMinutes: number;
  movementDate: string;
  note: string | null;
  reversalOfMovementId: string | null;
  createdAt: Date;
};

type OwnerScope = {
  state: "ready";
  tutorId: string;
  cycle: TutorSelfServiceCycle;
  tutor: TutorSelfServiceTutor;
  membership: TutorSelfServiceCycleMembership;
};

type OwnerResolution = OwnerScope | TutorSelfServiceRequiredAction;

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

const movementSelection = {
  id: hourMovement.id,
  categoryId: hourCategory.id,
  categoryName: hourCategory.name,
  categoryActivityKind: hourCategory.activityKind,
  categoryStatus: hourCategory.status,
  direction: hourMovement.direction,
  durationMinutes: hourMovement.durationMinutes,
  movementDate: hourMovement.movementDate,
  note: hourMovement.note,
  reversalOfMovementId: hourMovement.reversalOfMovementId,
  createdAt: hourMovement.createdAt,
};

function toIso(value: Date) {
  return value.toISOString();
}

function toSafeCycle(row: CycleRow): TutorSelfServiceCycle {
  return { ...row };
}

function toSafePlan(row: Pick<PlanRow, keyof PlanRow>): TutorSelfServicePlan {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    validFrom: row.validFrom,
    validTo: row.validTo,
    status: row.status,
  };
}

export function toSafeTutorMovement(
  row: MovementRow,
  reversalMovementId: string | null,
): TutorSelfServiceMovement {
  return {
    id: row.id,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      activityKind: row.categoryActivityKind,
      status: row.categoryStatus,
    },
    direction: row.direction,
    durationMinutes: row.durationMinutes,
    signedDurationMinutes: calculateSignedHourMinutes(
      row.direction,
      row.durationMinutes,
    ),
    movementDate: row.movementDate,
    note: row.note,
    reversalOfMovementId: row.reversalOfMovementId,
    reversalMovementId,
    reversalState:
      row.reversalOfMovementId !== null
        ? "REVERSAL"
        : reversalMovementId === null
          ? "CONFIRMED"
          : "REVERSED",
    createdAt: toIso(row.createdAt),
  };
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TutorSelfServiceError(
        TUTOR_SELF_SERVICE_ERROR_CODES.validationError,
        "The Tutor self-service input is invalid.",
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

    throw error;
  }
}

function parseApplicationUserId(applicationUserId: string) {
  return parseInput(applicationUserIdSchema, applicationUserId);
}

function parseToday(options: TutorSelfServiceReadOptions) {
  return options.today === undefined
    ? new Date().toISOString().slice(0, 10)
    : parseInput(dateOnlySchema, options.today);
}

async function runQuery<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TutorSelfServiceError) {
      throw error;
    }

    throw new TutorSelfServiceError(
      TUTOR_SELF_SERVICE_ERROR_CODES.queryFailed,
      "The Tutor self-service data could not be loaded.",
    );
  }
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isWithinCycle(date: string, cycle: Pick<CycleRow, "startDate" | "endDate">) {
  return date >= cycle.startDate && date <= cycle.endDate;
}

export type TutorSelfServiceScheduleWindow =
  | {
      mode: "current" | "upcoming" | "selected";
      anchorDate: string;
      startDate: string;
      endDate: string;
    }
  | {
      mode: "empty-upcoming";
      anchorDate: null;
      startDate: null;
      endDate: null;
    };

export function resolveTutorSelfServiceScheduleWindow(
  cycle: Pick<CycleRow, "startDate" | "endDate">,
  input: TutorSelfServiceScheduleQuery,
  today: string,
): TutorSelfServiceScheduleWindow {
  if (input.date === undefined && input.weekStart === undefined) {
    if (today > cycle.endDate) {
      return {
        mode: "empty-upcoming",
        anchorDate: null,
        startDate: null,
        endDate: null,
      };
    }

    const anchorDate = today < cycle.startDate ? cycle.startDate : today;
    return {
      mode: today < cycle.startDate ? "upcoming" : "current",
      anchorDate,
      startDate: anchorDate,
      endDate: minDate(addDays(anchorDate, 6), cycle.endDate),
    };
  }

  const startDate = input.weekStart ?? input.date!;
  const endDate = input.weekEnd ?? minDate(addDays(startDate, 6), cycle.endDate);

  if (!isWithinCycle(startDate, cycle) || !isWithinCycle(endDate, cycle)) {
    throw new TutorSelfServiceError(
      TUTOR_SELF_SERVICE_ERROR_CODES.dateOutsideCycle,
      "The requested Tutor schedule window must fall within the current cycle.",
    );
  }

  return {
    mode: "selected",
    anchorDate: startDate,
    startDate,
    endDate,
  };
}

function minDate(left: string, right: string) {
  return left < right ? left : right;
}

export function selectTutorSelfServiceEffectivePlan(
  plans: PlanRow[],
  date: string,
): PlanRow | null {
  const applicablePlans = plans.filter(
    (plan) =>
      plan.status === "ACTIVE" &&
      plan.validFrom <= date &&
      plan.validTo >= date,
  );
  const specialPlans = applicablePlans
    .filter((plan) => plan.kind === "SPECIAL")
    .sort(
      (left, right) =>
        left.validFrom.localeCompare(right.validFrom) ||
        left.id.localeCompare(right.id),
    );

  if (specialPlans.length > 1) {
    throw new TutorSelfServiceError(
      TUTOR_SELF_SERVICE_ERROR_CODES.specialPlanOverlap,
      "More than one active special plan applies to the requested date.",
    );
  }

  if (specialPlans[0] !== undefined) {
    return specialPlans[0];
  }

  const regularPlans = applicablePlans
    .filter((plan) => plan.kind === "REGULAR")
    .sort(
      (left, right) =>
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.id.localeCompare(right.id),
    );

  return regularPlans[0] ?? null;
}

export function selectTutorSelfServiceAssignmentsForDate(
  assignments: AssignmentRow[],
  plan: Pick<PlanRow, "id"> | null,
  date: string,
): AssignmentRow[] {
  if (plan === null) {
    return [];
  }

  const weekday = getIsoWeekday(date);

  return assignments
    .filter(
      (assignment) =>
        assignment.planId === plan.id &&
        ((assignment.pattern === "WEEKDAY" && assignment.weekday === weekday) ||
          (assignment.pattern === "DATE" &&
            assignment.assignmentDate === date)),
    )
    .sort(
      (left, right) =>
        left.startMinutes - right.startMinutes ||
        left.id.localeCompare(right.id),
    );
}

export function calculateTutorSelfServiceBalance(
  movements: Array<Pick<MovementRow, "direction" | "durationMinutes">>,
) {
  const signedBalanceMinutes = movements.reduce(
    (total, movement) =>
      total +
      calculateSignedHourMinutes(movement.direction, movement.durationMinutes),
    0,
  );

  return {
    signedBalanceMinutes,
    state: deriveHourBalanceState(signedBalanceMinutes),
  };
}

async function resolveOwnerScope(
  db: SelectDatabase,
  applicationUserId: string,
): Promise<OwnerResolution> {
  const normalizedUserId = parseApplicationUserId(applicationUserId);
  const [identity] = await db
    .select({ id: user.id, role: user.role, enabled: user.enabled })
    .from(user)
    .where(eq(user.id, normalizedUserId))
    .limit(1);

  if (identity === undefined) {
    throw new TutorSelfServiceError(
      TUTOR_SELF_SERVICE_ERROR_CODES.ownerNotFound,
      "The authenticated application user could not be resolved.",
    );
  }

  if (identity.role !== "TUTOR" || !identity.enabled) {
    throw new TutorSelfServiceError(
      TUTOR_SELF_SERVICE_ERROR_CODES.ownerNotAllowed,
      "The authenticated application user cannot access Tutor self-service.",
    );
  }

  const [tutorRow] = await db
    .select({
      id: tutor.id,
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      preferredDisplayName: tutor.preferredDisplayName,
      tutorStatus: tutor.status,
      careerId: career.id,
      careerName: career.name,
      careerStatus: career.status,
    })
    .from(tutor)
    .innerJoin(career, eq(tutor.primaryCareerId, career.id))
    .where(eq(tutor.applicationUserId, normalizedUserId))
    .limit(1);

  if (tutorRow === undefined) {
    return {
      state: "required-action",
      reason: "ACCOUNT_NOT_LINKED",
    };
  }

  const [cycleRow] = await db
    .select(cycleSelection)
    .from(administrativeCycle)
    .where(eq(administrativeCycle.status, "OPEN"))
    .orderBy(desc(administrativeCycle.startDate), desc(administrativeCycle.id))
    .limit(1);

  if (cycleRow === undefined) {
    return {
      state: "required-action",
      reason: "OPEN_CYCLE_REQUIRED",
    };
  }

  const [membershipRow] = await db
    .select({
      scholarshipReferenceId: tutorCycleMembership.scholarshipReferenceId,
      scholarshipType: scholarshipReference.type,
      scholarshipKnownRequiredHours: scholarshipReference.knownRequiredHours,
      scholarshipNotes: scholarshipReference.notes,
      scholarshipStatus: scholarshipReference.status,
    })
    .from(tutorCycleMembership)
    .leftJoin(
      scholarshipReference,
      eq(tutorCycleMembership.scholarshipReferenceId, scholarshipReference.id),
    )
    .where(
      and(
        eq(tutorCycleMembership.tutorId, tutorRow.id),
        eq(tutorCycleMembership.cycleId, cycleRow.id),
      ),
    )
    .limit(1);

  if (membershipRow === undefined) {
    return {
      state: "required-action",
      reason: "CYCLE_MEMBERSHIP_REQUIRED",
      cycle: toSafeCycle(cycleRow),
    };
  }

  const subjectRows = await db
    .select({
      id: subject.id,
      name: subject.name,
      status: subject.status,
    })
    .from(tutorSubject)
    .innerJoin(subject, eq(tutorSubject.subjectId, subject.id))
    .where(eq(tutorSubject.tutorId, tutorRow.id))
    .orderBy(asc(subject.normalizedName), asc(subject.id));

  return {
    state: "ready" as const,
    tutorId: tutorRow.id,
    cycle: toSafeCycle(cycleRow),
    tutor: {
      displayName:
        tutorRow.preferredDisplayName ??
        `${tutorRow.lastName}, ${tutorRow.firstName}`,
      career: {
        id: tutorRow.careerId,
        name: tutorRow.careerName,
        status: tutorRow.careerStatus,
      },
      status: tutorRow.tutorStatus,
      subjects: subjectRows,
    },
    membership: {
      cycleId: cycleRow.id,
      scholarshipReference:
        membershipRow.scholarshipReferenceId === null ||
        membershipRow.scholarshipType === null ||
        membershipRow.scholarshipStatus === null
          ? null
          : {
              id: membershipRow.scholarshipReferenceId,
              type: membershipRow.scholarshipType,
              knownRequiredHours: membershipRow.scholarshipKnownRequiredHours,
              notes: membershipRow.scholarshipNotes,
              status: membershipRow.scholarshipStatus,
            },
    },
  };
}

async function getSchedulePlans(
  db: SelectDatabase,
  cycle: CycleRow,
  window: Exclude<TutorSelfServiceScheduleWindow, { mode: "empty-upcoming" }>,
) {
  return db
    .select(planSelection)
    .from(schedulePlan)
    .where(
      and(
        eq(schedulePlan.cycleId, cycle.id),
        eq(schedulePlan.status, "ACTIVE"),
        lte(schedulePlan.validFrom, window.endDate),
        gte(schedulePlan.validTo, window.startDate),
      ),
    )
    .orderBy(asc(schedulePlan.validFrom), asc(schedulePlan.id));
}

async function readScheduleForScope(
  db: SelectDatabase,
  scope: OwnerScope,
  input: TutorSelfServiceScheduleQuery,
  today: string,
) {
  const window = resolveTutorSelfServiceScheduleWindow(scope.cycle, input, today);

  if (window.mode === "empty-upcoming") {
    return {
      state: "empty-upcoming" as const,
      cycle: scope.cycle,
      window,
      effectivePlan: null,
      days: [],
      nextDuty: null,
    };
  }

  const plans = await getSchedulePlans(db, scope.cycle, window);
  const planIds = plans.map((plan) => plan.id);
  const assignments =
    planIds.length === 0
      ? []
      : await db
          .select({
            id: scheduleAssignment.id,
            planId: scheduleAssignment.planId,
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
              inArray(scheduleAssignment.planId, planIds),
              eq(scheduleAssignment.tutorId, scope.tutorId),
              eq(scheduleAssignment.status, "ACTIVE"),
            ),
          );

  const days: TutorSelfServiceScheduleDay[] = [];
  const assignmentsByDate: TutorSelfServiceScheduleAssignment[] = [];

  for (
    let currentDate = window.startDate;
    currentDate <= window.endDate;
    currentDate = addDays(currentDate, 1)
  ) {
    const plan = selectTutorSelfServiceEffectivePlan(plans, currentDate);
    const dayAssignments = selectTutorSelfServiceAssignmentsForDate(
      assignments,
      plan,
      currentDate,
    ).map((assignment) => ({
      id: assignment.id,
      planId: assignment.planId,
      date: currentDate,
      pattern: assignment.pattern,
      weekday: assignment.weekday,
      assignmentDate: assignment.assignmentDate,
      startMinutes: assignment.startMinutes,
      endMinutes: assignment.endMinutes,
      kind: assignment.kind,
      modality: assignment.modality,
    }));

    days.push({
      date: currentDate,
      weekday: getIsoWeekday(currentDate),
      plan: plan === null ? null : toSafePlan(plan),
      assignments: dayAssignments,
    });
    assignmentsByDate.push(...dayAssignments);
  }

  const nextReferenceDate =
    today < scope.cycle.startDate ? scope.cycle.startDate : today;
  const nextDuty =
    assignmentsByDate.find((assignment) => assignment.date >= nextReferenceDate) ??
    null;

  return {
    state: "ready" as const,
    cycle: scope.cycle,
    window,
    effectivePlan: (() => {
      const plan = selectTutorSelfServiceEffectivePlan(plans, window.anchorDate);
      return plan === null ? null : toSafePlan(plan);
    })(),
    days,
    nextDuty,
  };
}

async function readHoursForScope(
  db: SelectDatabase,
  scope: OwnerScope,
): Promise<Exclude<TutorSelfServiceHours, TutorSelfServiceRequiredAction>> {
  const rows = await db
    .select(movementSelection)
    .from(hourMovement)
    .innerJoin(hourCategory, eq(hourMovement.categoryId, hourCategory.id))
    .where(
      and(
        eq(hourMovement.cycleId, scope.cycle.id),
        eq(hourMovement.tutorId, scope.tutorId),
      ),
    )
    .orderBy(desc(hourMovement.createdAt), desc(hourMovement.id));

  const originalMovementIds = rows
    .filter((row) => row.reversalOfMovementId === null)
    .map((row) => row.id);
  const reversalRows =
    originalMovementIds.length === 0
      ? []
      : await db
          .select({
            id: hourMovement.id,
            reversalOfMovementId: hourMovement.reversalOfMovementId,
          })
          .from(hourMovement)
          .where(
            and(
              eq(hourMovement.cycleId, scope.cycle.id),
              eq(hourMovement.tutorId, scope.tutorId),
              inArray(hourMovement.reversalOfMovementId, originalMovementIds),
            ),
          );
  const reversalByOriginal = new Map(
    reversalRows
      .filter(
        (row): row is { id: string; reversalOfMovementId: string } =>
          row.reversalOfMovementId !== null,
      )
      .map((row) => [row.reversalOfMovementId, row.id]),
  );

  return {
    state: "ready",
    cycle: scope.cycle,
    balance: calculateTutorSelfServiceBalance(rows),
    movements: rows.map((row) =>
      toSafeTutorMovement(row, reversalByOriginal.get(row.id) ?? null),
    ),
    historyComplete: true,
  };
}

export async function getTutorSelfServiceSummary(
  db: SelectDatabase,
  applicationUserId: string,
  options: TutorSelfServiceReadOptions = {},
): Promise<TutorSelfServiceSummary> {
  const today = parseToday(options);

  return runQuery(async () => {
    const owner = await resolveOwnerScope(db, applicationUserId);
    if (owner.state === "required-action") {
      return owner;
    }

    const [schedule, hours] = await Promise.all([
      readScheduleForScope(db, owner, {}, today),
      readHoursForScope(db, owner),
    ]);

    return {
      state: "ready" as const,
      cycle: owner.cycle,
      tutor: owner.tutor,
      membership: owner.membership,
      balance: hours.balance,
      nextDuty: schedule.nextDuty,
    };
  });
}

export async function getTutorSelfServiceSchedule(
  db: SelectDatabase,
  applicationUserId: string,
  input: unknown = {},
  options: TutorSelfServiceReadOptions = {},
): Promise<TutorSelfServiceSchedule> {
  const parsedInput = parseInput(tutorSelfServiceScheduleQuerySchema, input);
  const today = parseToday(options);

  return runQuery(async () => {
    const owner = await resolveOwnerScope(db, applicationUserId);
    if (owner.state === "required-action") {
      return owner;
    }

    return readScheduleForScope(db, owner, parsedInput, today);
  });
}

export async function getTutorSelfServiceHours(
  db: SelectDatabase,
  applicationUserId: string,
  input: unknown = {},
): Promise<TutorSelfServiceHours> {
  const parsedInput: TutorSelfServiceHoursQuery = parseInput(
    tutorSelfServiceHoursQuerySchema,
    input,
  );
  void parsedInput;

  return runQuery(async () => {
    const owner = await resolveOwnerScope(db, applicationUserId);
    if (owner.state === "required-action") {
      return owner;
    }

    return readHoursForScope(db, owner);
  });
}
