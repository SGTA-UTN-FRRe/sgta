import "server-only";

import {
  and,
  asc,
  eq,
  inArray,
} from "drizzle-orm";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit-core";
import type { Database } from "@/db/client-core";
import {
  activity,
  administrativeCycle,
  attendanceRecord,
  dutyOccurrence,
  hourMovement,
  user,
  type AttendanceDebitStatus,
  type AttendanceStatus,
} from "@/db/schema";
import {
  HOUR_ERROR_CODES,
  HourServiceError,
  recordHourMovementInTransaction,
  reverseHourMovementInTransaction,
  type HourMutationContext,
  type HourMutationDatabase,
  type SafeHourMovement,
  type SafeHourReversalResult,
} from "@/features/hours/hour-service";

import {
  resolveEffectiveScheduleInTransaction,
  ScheduleServiceError,
  type SafeDutyOccurrence,
  type SafeEffectiveSchedule,
  type ScheduleMutationContext,
  type ScheduleMutationDatabase,
} from "./schedule-service";
import {
  absenceDebitInputSchema,
  attendanceCorrectionInputSchema,
  attendanceDateInputSchema,
  attendanceEmptyInputSchema,
  attendanceStatusInputSchema,
  recoveryRecognitionInputSchema,
  type ParsedAbsenceDebitInput,
  type ParsedAttendanceCorrectionInput,
  type ParsedAttendanceDateInput,
  type ParsedAttendanceStatusInput,
  type ParsedRecoveryRecognitionInput,
} from "./attendance-validation";

export const ATTENDANCE_ERROR_CODES = {
  validationError: "validation_error",
  queryFailed: "query_failed",
  transactionFailed: "transaction_failed",
  actorRequired: "actor_required",
  actorNotFound: "actor_not_found",
  cycleNotFound: "cycle_not_found",
  cycleNotOpen: "cycle_not_open",
  dateOutsideCycle: "date_outside_cycle",
  occurrenceNotFound: "occurrence_not_found",
  attendanceNotFound: "attendance_not_found",
  statusAlreadySet: "status_already_set",
  correctionRequired: "correction_required",
  absenceProposalNotFound: "absence_proposal_not_found",
  debitAlreadyConfirmed: "debit_already_confirmed",
  debitMinutesInvalid: "debit_minutes_invalid",
  debitFieldsRequireAbsence: "debit_fields_require_absence",
  categoryNotFound: "category_not_found",
  inactiveCategory: "inactive_category",
  recoveryCategoryRequired: "recovery_category_required",
  recoveryNotEligible: "recovery_not_eligible",
  recoveryAlreadyRecognized: "recovery_already_recognized",
  scheduleConflict: "schedule_conflict",
} as const;

export type AttendanceServiceErrorCode =
  (typeof ATTENDANCE_ERROR_CODES)[keyof typeof ATTENDANCE_ERROR_CODES];

export type AttendanceValidationIssue = {
  code: string;
  path: Array<string | number>;
  message: string;
};

export type AttendanceServiceErrorDetails = Record<
  string,
  string | number | null | string[]
>;

export class AttendanceServiceError extends Error {
  readonly code: AttendanceServiceErrorCode;
  readonly details?: AttendanceServiceErrorDetails;
  readonly issues?: AttendanceValidationIssue[];

  constructor(
    code: AttendanceServiceErrorCode,
    message: string,
    options: {
      details?: AttendanceServiceErrorDetails;
      issues?: AttendanceValidationIssue[];
    } = {},
  ) {
    super(message);
    this.name = "AttendanceServiceError";
    this.code = code;
    this.details = options.details;
    this.issues = options.issues;
  }
}

export type AttendanceMutationContext = {
  actorId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
};

export type SafeAttendanceRecord = {
  id: string;
  occurrenceId: string;
  status: AttendanceStatus;
  debitStatus: AttendanceDebitStatus;
  proposedDebitMinutes: number | null;
  recognizedDebitMinutes: number | null;
  updatedAt: string;
};

export type SafeAttendanceOccurrence = {
  occurrence: SafeDutyOccurrence;
  attendance: SafeAttendanceRecord;
};

export type SafeAttendanceDateResult = {
  cycle: SafeEffectiveSchedule["cycle"];
  plan: SafeEffectiveSchedule["plan"];
  date: string;
  occurrences: SafeAttendanceOccurrence[];
};

export type SafeAttendanceMutationResult = {
  attendance: SafeAttendanceOccurrence;
  movement: SafeHourMovement | null;
  reversal: SafeHourReversalResult | null;
};

export type SafeRecoveryRecognitionResult = {
  attendance: SafeAttendanceOccurrence;
  movement: SafeHourMovement;
};

export type AttendanceMutationDatabase = Pick<
  Database,
  "select" | "insert" | "update" | "execute"
>;

type AttendanceRecordRow = {
  id: string;
  occurrenceId: string;
  status: AttendanceStatus;
  debitStatus: AttendanceDebitStatus;
  proposedDebitMinutes: number | null;
  recognizedDebitMinutes: number | null;
  actorId: string;
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
  kind: "DUTY" | "RECOVERY";
  modality: string | null;
  createdAt: Date;
};

type CycleRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
};

const attendanceSelection = {
  id: attendanceRecord.id,
  occurrenceId: attendanceRecord.occurrenceId,
  status: attendanceRecord.status,
  debitStatus: attendanceRecord.debitStatus,
  proposedDebitMinutes: attendanceRecord.proposedDebitMinutes,
  recognizedDebitMinutes: attendanceRecord.recognizedDebitMinutes,
  actorId: attendanceRecord.actorId,
  createdAt: attendanceRecord.createdAt,
  updatedAt: attendanceRecord.updatedAt,
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

const cycleSelection = {
  id: administrativeCycle.id,
  name: administrativeCycle.name,
  startDate: administrativeCycle.startDate,
  endDate: administrativeCycle.endDate,
  status: administrativeCycle.status,
};

function toSafeAttendanceRecord(
  row: AttendanceRecordRow,
): SafeAttendanceRecord {
  return {
    id: row.id,
    occurrenceId: row.occurrenceId,
    status: row.status,
    debitStatus: row.debitStatus,
    proposedDebitMinutes: row.proposedDebitMinutes,
    recognizedDebitMinutes: row.recognizedDebitMinutes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSafeAttendanceOccurrence(
  occurrence: SafeDutyOccurrence,
  attendance: AttendanceRecordRow,
): SafeAttendanceOccurrence {
  return {
    occurrence,
    attendance: toSafeAttendanceRecord(attendance),
  };
}

function toScheduleContext(
  context: AttendanceMutationContext,
): ScheduleMutationContext {
  return context;
}

function toHourContext(context: AttendanceMutationContext): HourMutationContext {
  return context;
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

function createValidationError(error: z.ZodError) {
  return new AttendanceServiceError(
    ATTENDANCE_ERROR_CODES.validationError,
    "The attendance input is invalid.",
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
    return z.string().trim().uuid().parse(value);
  } catch {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.validationError,
      "The attendance identifier is invalid.",
      { details: { field } },
    );
  }
}

function assertActorProvided(actorId: string | null | undefined) {
  const normalizedActorId = actorId?.trim();

  if (normalizedActorId === undefined || normalizedActorId.length === 0) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.actorRequired,
      "An authenticated actor is required for attendance changes.",
    );
  }
}

async function requireUserActor(
  db: Pick<Database, "select">,
  actorId: string | null | undefined,
) {
  const normalizedActorId = actorId?.trim();

  if (normalizedActorId === undefined || normalizedActorId.length === 0) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.actorRequired,
      "An authenticated actor is required for attendance changes.",
    );
  }

  const [actor] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, normalizedActorId))
    .limit(1);

  if (actor === undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.actorNotFound,
      "The audit actor was not found.",
      { details: { actorId: normalizedActorId } },
    );
  }

  return { id: normalizedActorId };
}

async function getCycle(
  db: Pick<Database, "select">,
  cycleId: string,
  lock = false,
): Promise<CycleRow> {
  const query = db
    .select(cycleSelection)
    .from(administrativeCycle)
    .where(eq(administrativeCycle.id, cycleId))
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;

  if (row === undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.cycleNotFound,
      "The administrative cycle was not found.",
      { details: { cycleId } },
    );
  }

  if (lock && row.status !== "OPEN") {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.cycleNotOpen,
      "The administrative cycle is not open.",
      { details: { cycleId } },
    );
  }

  return row;
}

function assertDateWithinCycle(date: string, cycle: CycleRow) {
  if (date < cycle.startDate || date > cycle.endDate) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.dateOutsideCycle,
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

async function getOccurrence(
  db: Pick<Database, "select">,
  occurrenceId: string,
  lock = false,
): Promise<OccurrenceRow> {
  const query = db
    .select(occurrenceSelection)
    .from(dutyOccurrence)
    .where(eq(dutyOccurrence.id, occurrenceId))
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;

  if (row === undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.occurrenceNotFound,
      "The duty occurrence was not found.",
      { details: { occurrenceId } },
    );
  }

  return row;
}

async function getOccurrenceForWrite(
  db: AttendanceMutationDatabase,
  occurrenceId: string,
) {
  const initial = await getOccurrence(db, occurrenceId);
  const cycle = await getCycle(db, initial.cycleId, true);
  const occurrence = await getOccurrence(db, occurrenceId, true);
  assertDateWithinCycle(occurrence.occurrenceDate, cycle);

  return { cycle, occurrence };
}

async function getAttendanceRecord(
  db: Pick<Database, "select">,
  occurrenceId: string,
  lock = false,
): Promise<AttendanceRecordRow | undefined> {
  const query = db
    .select(attendanceSelection)
    .from(attendanceRecord)
    .where(eq(attendanceRecord.occurrenceId, occurrenceId))
    .limit(1);
  const [row] = lock ? await query.for("update") : await query;

  return row;
}

async function ensureAttendanceRecord(
  db: AttendanceMutationDatabase,
  occurrence: OccurrenceRow,
  actorId: string,
  context: AttendanceMutationContext,
) {
  const existing = await getAttendanceRecord(db, occurrence.id, true);
  if (existing !== undefined) {
    return existing;
  }

  const [created] = await db
    .insert(attendanceRecord)
    .values({
      occurrenceId: occurrence.id,
      status: "PENDING",
      debitStatus: "NOT_PROPOSED",
      proposedDebitMinutes: null,
      recognizedDebitMinutes: null,
      actorId,
    })
    .returning(attendanceSelection);

  if (created === undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.transactionFailed,
      "The attendance record could not be created.",
    );
  }

  await recordAuditEvent(db, {
    actorId,
    action: "attendance_record.created",
    entityType: "attendance_record",
    entityId: created.id,
    metadata: {
      occurrenceId: occurrence.id,
      cycleId: occurrence.cycleId,
      status: created.status,
      debitStatus: created.debitStatus,
    },
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
  });

  return created;
}

async function updateAttendanceRecord(
  db: AttendanceMutationDatabase,
  attendanceId: string,
  values: Partial<typeof attendanceRecord.$inferInsert>,
) {
  const [updated] = await db
    .update(attendanceRecord)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(attendanceRecord.id, attendanceId))
    .returning(attendanceSelection);

  if (updated === undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.attendanceNotFound,
      "The attendance record was not found.",
      { details: { attendanceId } },
    );
  }

  return updated;
}

async function getLinkedMovements(
  db: Pick<Database, "select">,
  attendanceId: string,
) {
  return db
    .select({
      id: hourMovement.id,
      reversalOfMovementId: hourMovement.reversalOfMovementId,
      durationMinutes: hourMovement.durationMinutes,
    })
    .from(hourMovement)
    .where(eq(hourMovement.attendanceRecordId, attendanceId))
    .orderBy(asc(hourMovement.createdAt), asc(hourMovement.id));
}

async function getActiveLinkedMovement(
  db: Pick<Database, "select">,
  attendanceId: string,
) {
  const linked = await getLinkedMovements(db, attendanceId);
  const reversedIds = new Set(
    linked
      .map((movement) => movement.reversalOfMovementId)
      .filter((id): id is string => id !== null),
  );

  return linked.find(
    (movement) =>
      movement.reversalOfMovementId === null && !reversedIds.has(movement.id),
  );
}

export function calculateOccurrenceDurationMinutes(
  startMinutes: number,
  endMinutes: number,
) {
  const durationMinutes = endMinutes - startMinutes;

  if (
    !Number.isInteger(startMinutes) ||
    !Number.isInteger(endMinutes) ||
    startMinutes < 0 ||
    endMinutes > 1_440 ||
    durationMinutes < 1
  ) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.debitMinutesInvalid,
      "The occurrence duration must be a positive range within the day.",
      { details: { startMinutes, endMinutes } },
    );
  }

  return durationMinutes;
}

function assertDebitMinutes(
  debitMinutes: number,
  occurrence: OccurrenceRow,
) {
  const occurrenceMinutes = calculateOccurrenceDurationMinutes(
    occurrence.startMinutes,
    occurrence.endMinutes,
  );

  if (debitMinutes < 1 || debitMinutes > occurrenceMinutes) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.debitMinutesInvalid,
      "The debit minutes must be positive and no greater than the occurrence duration.",
      {
        details: {
          debitMinutes,
          occurrenceMinutes,
          occurrenceId: occurrence.id,
        },
      },
    );
  }
}

async function createDebitMovement(
  db: AttendanceMutationDatabase,
  occurrence: OccurrenceRow,
  attendance: AttendanceRecordRow,
  categoryId: string,
  debitMinutes: number,
  note: string | null | undefined,
  context: AttendanceMutationContext,
) {
  const activeMovement = await getActiveLinkedMovement(db, attendance.id);
  if (activeMovement !== undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.debitAlreadyConfirmed,
      "The attendance already has a confirmed debit movement.",
      {
        details: {
          attendanceId: attendance.id,
          movementId: activeMovement.id,
        },
      },
    );
  }

  const result = await recordHourMovementInTransaction(
    db as HourMutationDatabase,
    {
      cycleId: occurrence.cycleId,
      tutorIds: [occurrence.tutorId],
      categoryId,
      direction: "DEBIT",
      duration: debitMinutes,
      movementDate: occurrence.occurrenceDate,
      note: note ?? null,
    },
    toHourContext(context),
    undefined,
    { attendanceRecordId: attendance.id },
  );
  const movement = result.movements[0];

  if (movement === undefined) {
    throw new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.transactionFailed,
      "The absence debit movement could not be created.",
    );
  }

  return movement;
}

async function auditAttendanceChange(
  db: AttendanceMutationDatabase,
  actorId: string,
  action: string,
  attendance: AttendanceRecordRow,
  metadata: Record<string, string | number | null | string[]>,
  context: AttendanceMutationContext,
) {
  await recordAuditEvent(db, {
    actorId,
    action,
    entityType: "attendance_record",
    entityId: attendance.id,
    metadata: {
      occurrenceId: attendance.occurrenceId,
      ...metadata,
    },
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
  });
}

function mapScheduleError(error: ScheduleServiceError) {
  switch (error.code) {
    case "actor_required":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.actorRequired,
        error.message,
        { details: error.details },
      );
    case "actor_not_found":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.actorNotFound,
        error.message,
        { details: error.details },
      );
    case "cycle_not_found":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.cycleNotFound,
        error.message,
        { details: error.details },
      );
    case "cycle_not_open":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.cycleNotOpen,
        error.message,
        { details: error.details },
      );
    case "date_outside_cycle":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.dateOutsideCycle,
        error.message,
        { details: error.details },
      );
    case "validation_error":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.validationError,
        error.message,
        { details: error.details, issues: error.issues },
      );
    case "special_plan_overlap":
    case "regular_plan_conflict":
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.scheduleConflict,
        error.message,
        { details: error.details },
      );
    default:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.transactionFailed,
        "The attendance schedule could not be resolved.",
      );
  }
}

function mapHourError(error: HourServiceError) {
  switch (error.code) {
    case HOUR_ERROR_CODES.actorRequired:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.actorRequired,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.actorNotFound:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.actorNotFound,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.cycleNotFound:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.cycleNotFound,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.cycleNotOpen:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.cycleNotOpen,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.categoryNotFound:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.categoryNotFound,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.inactiveCategory:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.inactiveCategory,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.recoveryCategoryRequired:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.recoveryCategoryRequired,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.movementDateOutsideCycle:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.dateOutsideCycle,
        error.message,
        { details: error.details },
      );
    case HOUR_ERROR_CODES.validationError:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.validationError,
        error.message,
        { details: error.details, issues: error.issues },
      );
    default:
      return new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.transactionFailed,
        "The attendance hour operation could not be completed.",
      );
  }
}

export function mapAttendanceMutationError(error: unknown) {
  if (error instanceof AttendanceServiceError) {
    return error;
  }

  if (error instanceof ScheduleServiceError) {
    return mapScheduleError(error);
  }

  if (error instanceof HourServiceError) {
    return mapHourError(error);
  }

  const { code, constraint } = getDatabaseErrorInfo(error);
  if (code === "23505" && constraint?.includes("attendance_record_occurrence")) {
    return new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.transactionFailed,
      "The attendance record already exists for this occurrence.",
    );
  }

  if (code === "23503" || code === "23514" || code === "22P02") {
    return new AttendanceServiceError(
      ATTENDANCE_ERROR_CODES.validationError,
      "The attendance operation contains an invalid relationship or value.",
    );
  }

  return new AttendanceServiceError(
    ATTENDANCE_ERROR_CODES.transactionFailed,
    "The attendance operation could not be completed.",
  );
}

async function runMutation<T>(
  db: Database,
  operation: (transaction: AttendanceMutationDatabase) => Promise<T>,
) {
  try {
    return await db.transaction((transaction) => operation(transaction));
  } catch (error) {
    throw mapAttendanceMutationError(error);
  }
}

async function ensureDateAttendanceRecords(
  db: AttendanceMutationDatabase,
  effective: SafeEffectiveSchedule,
  actorId: string,
  context: AttendanceMutationContext,
) {
  const occurrences = effective.occurrences;
  if (occurrences.length === 0) {
    return [] as SafeAttendanceOccurrence[];
  }

  await db
    .select({ id: dutyOccurrence.id })
    .from(dutyOccurrence)
    .where(inArray(dutyOccurrence.id, occurrences.map((item) => item.id)))
    .for("update");

  const result: SafeAttendanceOccurrence[] = [];
  for (const occurrence of occurrences) {
    const occurrenceRow = await getOccurrence(db, occurrence.id, true);
    const attendance = await ensureAttendanceRecord(
      db,
      occurrenceRow,
      actorId,
      context,
    );
    result.push(toSafeAttendanceOccurrence(occurrence, attendance));
  }

  return result;
}

async function getMutationOccurrence(
  db: AttendanceMutationDatabase,
  occurrenceId: string,
  actorId: string,
  context: AttendanceMutationContext,
) {
  const { occurrence } = await getOccurrenceForWrite(db, occurrenceId);
  const attendance = await ensureAttendanceRecord(
    db,
    occurrence,
    actorId,
    context,
  );
  const safeOccurrence = toSafeDutyOccurrence(occurrence);

  return { occurrence, safeOccurrence, attendance };
}

function toSafeDutyOccurrence(row: OccurrenceRow): SafeDutyOccurrence {
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
    createdAt: row.createdAt.toISOString(),
  };
}

function buildAttendanceMutationResult(
  safeOccurrence: SafeDutyOccurrence,
  attendance: AttendanceRecordRow,
  movement: SafeHourMovement | null = null,
  reversal: SafeHourReversalResult | null = null,
): SafeAttendanceMutationResult {
  return {
    attendance: toSafeAttendanceOccurrence(safeOccurrence, attendance),
    movement,
    reversal,
  };
}

export function parseAttendanceDateServiceInput(input: unknown) {
  return parseServiceInput(attendanceDateInputSchema, input);
}

export function parseAttendanceStatusServiceInput(input: unknown) {
  return parseServiceInput(attendanceStatusInputSchema, input);
}

export function parseAbsenceDebitServiceInput(input: unknown) {
  return parseServiceInput(absenceDebitInputSchema, input);
}

export function parseAttendanceCorrectionServiceInput(input: unknown) {
  return parseServiceInput(attendanceCorrectionInputSchema, input);
}

export function parseRecoveryRecognitionServiceInput(input: unknown) {
  return parseServiceInput(recoveryRecognitionInputSchema, input);
}

export async function listAttendanceForDate(
  db: Database,
  input: unknown,
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceDateResult> {
  const parsed: ParsedAttendanceDateInput = parseAttendanceDateServiceInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const effective = await resolveEffectiveScheduleInTransaction(
      transaction as ScheduleMutationDatabase,
      parsed,
      toScheduleContext(context),
    );
    const occurrences = await ensureDateAttendanceRecords(
      transaction,
      effective,
      actor.id,
      context,
    );

    return {
      cycle: effective.cycle,
      plan: effective.plan,
      date: parsed.date,
      occurrences,
    };
  });
}

export async function getAttendanceOccurrence(
  db: Database,
  occurrenceId: string,
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceOccurrence> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    return toSafeAttendanceOccurrence(safeOccurrence, attendance);
  });
}

export async function setAttendanceStatus(
  db: Database,
  occurrenceId: string,
  input: unknown,
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceMutationResult> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  const parsed: ParsedAttendanceStatusInput =
    parseAttendanceStatusServiceInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { occurrence, safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    if (attendance.status !== "PENDING") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.correctionRequired,
        "An existing attendance decision requires an explicit correction.",
        {
          details: {
            occurrenceId: occurrence.id,
            status: attendance.status,
          },
        },
      );
    }

    const next =
      parsed.status === "PRESENT"
        ? {
            status: "PRESENT" as const,
            debitStatus: "NOT_PROPOSED" as const,
            proposedDebitMinutes: null,
            recognizedDebitMinutes: null,
          }
        : {
            status: "ABSENT" as const,
            debitStatus: "PROPOSED" as const,
            proposedDebitMinutes: calculateOccurrenceDurationMinutes(
              occurrence.startMinutes,
              occurrence.endMinutes,
            ),
            recognizedDebitMinutes: null,
          };
    const updated = await updateAttendanceRecord(transaction, attendance.id, {
      ...next,
      actorId: actor.id,
    });

    await auditAttendanceChange(
      transaction,
      actor.id,
      "attendance_record.status_changed",
      updated,
      {
        previousStatus: attendance.status,
        status: updated.status,
        debitStatus: updated.debitStatus,
      },
      context,
    );

    return buildAttendanceMutationResult(
      safeOccurrence,
      updated,
    );
  });
}

export const markAttendance = setAttendanceStatus;

export async function cancelAbsenceDebit(
  db: Database,
  occurrenceId: string,
  input: unknown = {},
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceMutationResult> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  parseServiceInput(attendanceEmptyInputSchema, input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    if (attendance.status !== "ABSENT") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.absenceProposalNotFound,
        "The occurrence does not have an absence proposal.",
        { details: { occurrenceId: attendance.occurrenceId } },
      );
    }
    if (attendance.debitStatus === "CONFIRMED") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.debitAlreadyConfirmed,
        "A confirmed absence debit cannot be cancelled from this action.",
        { details: { attendanceId: attendance.id } },
      );
    }
    if (attendance.debitStatus === "CANCELLED") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.statusAlreadySet,
        "The absence debit proposal is already cancelled.",
        { details: { attendanceId: attendance.id } },
      );
    }

    const updated = await updateAttendanceRecord(transaction, attendance.id, {
      debitStatus: "CANCELLED",
      actorId: actor.id,
    });
    await auditAttendanceChange(
      transaction,
      actor.id,
      "attendance_record.debit_cancelled",
      updated,
      { previousDebitStatus: attendance.debitStatus, debitStatus: updated.debitStatus },
      context,
    );

    return buildAttendanceMutationResult(safeOccurrence, updated);
  });
}

export async function reopenAbsenceDebit(
  db: Database,
  occurrenceId: string,
  input: unknown = {},
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceMutationResult> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  parseServiceInput(attendanceEmptyInputSchema, input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    if (attendance.status !== "ABSENT") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.absenceProposalNotFound,
        "The occurrence does not have an absence proposal.",
        { details: { occurrenceId: attendance.occurrenceId } },
      );
    }
    if (attendance.debitStatus === "CONFIRMED") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.debitAlreadyConfirmed,
        "A confirmed absence debit cannot be reopened from this action.",
        { details: { attendanceId: attendance.id } },
      );
    }
    if (attendance.debitStatus === "PROPOSED") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.statusAlreadySet,
        "The absence debit proposal is already open.",
        { details: { attendanceId: attendance.id } },
      );
    }

    const updated = await updateAttendanceRecord(transaction, attendance.id, {
      debitStatus: "PROPOSED",
      actorId: actor.id,
    });
    await auditAttendanceChange(
      transaction,
      actor.id,
      "attendance_record.debit_reopened",
      updated,
      { previousDebitStatus: attendance.debitStatus, debitStatus: updated.debitStatus },
      context,
    );

    return buildAttendanceMutationResult(safeOccurrence, updated);
  });
}

export async function confirmAbsenceDebit(
  db: Database,
  occurrenceId: string,
  input: unknown,
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceMutationResult> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  const parsed: ParsedAbsenceDebitInput = parseAbsenceDebitServiceInput(input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { occurrence, safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    if (attendance.status !== "ABSENT") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.absenceProposalNotFound,
        "The occurrence must be ABSENT before confirming a debit.",
        { details: { occurrenceId: occurrence.id, status: attendance.status } },
      );
    }
    if (attendance.debitStatus === "CONFIRMED") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.debitAlreadyConfirmed,
        "The absence debit has already been confirmed.",
        { details: { attendanceId: attendance.id } },
      );
    }
    if (
      attendance.debitStatus !== "PROPOSED" &&
      attendance.debitStatus !== "CANCELLED"
    ) {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.absenceProposalNotFound,
        "The occurrence does not have a debit proposal to confirm.",
        { details: { attendanceId: attendance.id } },
      );
    }

    const debitMinutes =
      parsed.debitMinutes ??
      attendance.proposedDebitMinutes ??
      calculateOccurrenceDurationMinutes(
        occurrence.startMinutes,
        occurrence.endMinutes,
      );
    assertDebitMinutes(debitMinutes, occurrence);
    const movement = await createDebitMovement(
      transaction,
      occurrence,
      attendance,
      parsed.categoryId,
      debitMinutes,
      parsed.note,
      context,
    );
    const updated = await updateAttendanceRecord(transaction, attendance.id, {
      debitStatus: "CONFIRMED",
      recognizedDebitMinutes: debitMinutes,
      actorId: actor.id,
    });
    await auditAttendanceChange(
      transaction,
      actor.id,
      "attendance_record.debit_confirmed",
      updated,
      {
        previousDebitStatus: attendance.debitStatus,
        debitStatus: updated.debitStatus,
        movementId: movement.id,
        categoryId: parsed.categoryId,
        recognizedDebitMinutes: debitMinutes,
      },
      context,
    );

    return buildAttendanceMutationResult(safeOccurrence, updated, movement);
  });
}

export async function correctAttendance(
  db: Database,
  occurrenceId: string,
  input: unknown,
  context: AttendanceMutationContext = {},
): Promise<SafeAttendanceMutationResult> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  const parsed: ParsedAttendanceCorrectionInput =
    parseServiceInput(attendanceCorrectionInputSchema, input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { occurrence, safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    if (parsed.status === "PRESENT") {
      if (attendance.status === "PRESENT") {
        throw new AttendanceServiceError(
          ATTENDANCE_ERROR_CODES.statusAlreadySet,
          "The attendance is already PRESENT.",
          { details: { occurrenceId: occurrence.id } },
        );
      }

      const activeMovement = await getActiveLinkedMovement(
        transaction,
        attendance.id,
      );
      const reversal =
        activeMovement === undefined
          ? null
          : await reverseHourMovementInTransaction(
              transaction,
              activeMovement.id,
              toHourContext(context),
            );
      const updated = await updateAttendanceRecord(transaction, attendance.id, {
        status: "PRESENT",
        debitStatus: "NOT_PROPOSED",
        proposedDebitMinutes: null,
        recognizedDebitMinutes: null,
        actorId: actor.id,
      });
      await auditAttendanceChange(
        transaction,
        actor.id,
        "attendance_record.corrected",
        updated,
        {
          previousStatus: attendance.status,
          status: updated.status,
          reversalMovementId: reversal?.reversal.id ?? null,
          correctionNote: parsed.note ?? null,
        },
        context,
      );

      return buildAttendanceMutationResult(
        safeOccurrence,
        updated,
        null,
        reversal,
      );
    }

    const hasDebitFields =
      parsed.categoryId !== undefined || parsed.debitMinutes !== undefined;
    if (attendance.status !== "ABSENT") {
      if (hasDebitFields) {
        throw new AttendanceServiceError(
          ATTENDANCE_ERROR_CODES.debitFieldsRequireAbsence,
          "Debit details can only be supplied for an existing ABSENT decision.",
          { details: { occurrenceId: occurrence.id } },
        );
      }

      const updated = await updateAttendanceRecord(transaction, attendance.id, {
        status: "ABSENT",
        debitStatus: "PROPOSED",
        proposedDebitMinutes: calculateOccurrenceDurationMinutes(
          occurrence.startMinutes,
          occurrence.endMinutes,
        ),
        recognizedDebitMinutes: null,
        actorId: actor.id,
      });
      await auditAttendanceChange(
        transaction,
        actor.id,
        "attendance_record.corrected",
        updated,
        {
          previousStatus: attendance.status,
          status: updated.status,
          debitStatus: updated.debitStatus,
          correctionNote: parsed.note ?? null,
        },
        context,
      );

      return buildAttendanceMutationResult(safeOccurrence, updated);
    }

    if (!hasDebitFields) {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.statusAlreadySet,
        "The attendance is already ABSENT.",
        { details: { occurrenceId: occurrence.id } },
      );
    }
    if (parsed.categoryId === undefined) {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.validationError,
        "A category is required when correcting a debit.",
      );
    }

    const debitMinutes =
      parsed.debitMinutes ??
      attendance.recognizedDebitMinutes ??
      attendance.proposedDebitMinutes ??
      calculateOccurrenceDurationMinutes(
        occurrence.startMinutes,
        occurrence.endMinutes,
      );
    assertDebitMinutes(debitMinutes, occurrence);
    const activeMovement = await getActiveLinkedMovement(
      transaction,
      attendance.id,
    );
    const reversal =
      activeMovement === undefined
        ? null
        : await reverseHourMovementInTransaction(
            transaction,
            activeMovement.id,
            toHourContext(context),
          );
    const movement = await createDebitMovement(
      transaction,
      occurrence,
      attendance,
      parsed.categoryId,
      debitMinutes,
      parsed.note,
      context,
    );
    const updated = await updateAttendanceRecord(transaction, attendance.id, {
      status: "ABSENT",
      debitStatus: "CONFIRMED",
      proposedDebitMinutes: calculateOccurrenceDurationMinutes(
        occurrence.startMinutes,
        occurrence.endMinutes,
      ),
      recognizedDebitMinutes: debitMinutes,
      actorId: actor.id,
    });
    await auditAttendanceChange(
      transaction,
      actor.id,
      "attendance_record.corrected",
      updated,
      {
        previousStatus: attendance.status,
        status: updated.status,
        previousRecognizedDebitMinutes: attendance.recognizedDebitMinutes,
        recognizedDebitMinutes: debitMinutes,
        movementId: movement.id,
        reversalMovementId: reversal?.reversal.id ?? null,
        correctionNote: parsed.note ?? null,
      },
      context,
    );

    return buildAttendanceMutationResult(
      safeOccurrence,
      updated,
      movement,
      reversal,
    );
  });
}

export async function recognizeScheduledRecovery(
  db: Database,
  occurrenceId: string,
  input: unknown,
  context: AttendanceMutationContext = {},
): Promise<SafeRecoveryRecognitionResult> {
  const parsedOccurrenceId = parseIdentifier(occurrenceId, "occurrenceId");
  const parsed: ParsedRecoveryRecognitionInput =
    parseServiceInput(recoveryRecognitionInputSchema, input);
  assertActorProvided(context.actorId);

  return runMutation(db, async (transaction) => {
    const actor = await requireUserActor(transaction, context.actorId);
    const { occurrence, safeOccurrence, attendance } = await getMutationOccurrence(
      transaction,
      parsedOccurrenceId,
      actor.id,
      context,
    );

    if (occurrence.kind !== "RECOVERY") {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.recoveryNotEligible,
        "Only recovery-marked occurrences can be explicitly recognized as recovery.",
        { details: { occurrenceId: occurrence.id } },
      );
    }

    const [existingActivity] = await transaction
      .select({ id: activity.id })
      .from(activity)
      .where(
        and(
          eq(activity.dutyOccurrenceId, occurrence.id),
          eq(activity.kind, "RECOVERY"),
        ),
      )
      .limit(1);
    if (existingActivity !== undefined) {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.recoveryAlreadyRecognized,
        "Recovery has already been recognized for this occurrence.",
        { details: { occurrenceId: occurrence.id, activityId: existingActivity.id } },
      );
    }

    const result = await recordHourMovementInTransaction(
      transaction,
      {
        cycleId: occurrence.cycleId,
        tutorIds: [occurrence.tutorId],
        categoryId: parsed.categoryId,
        direction: "CREDIT",
        duration: calculateOccurrenceDurationMinutes(
          occurrence.startMinutes,
          occurrence.endMinutes,
        ),
        movementDate: occurrence.occurrenceDate,
        note: parsed.note ?? null,
      },
      toHourContext(context),
      "RECOVERY",
      { dutyOccurrenceId: occurrence.id },
    );
    const movement = result.movements[0];

    if (movement === undefined) {
      throw new AttendanceServiceError(
        ATTENDANCE_ERROR_CODES.transactionFailed,
        "The recovery movement could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "attendance_record.recovery_recognized",
      entityType: "attendance_record",
      entityId: attendance.id,
      metadata: {
        occurrenceId: occurrence.id,
        activityId: result.origin?.id ?? null,
        movementId: movement.id,
        categoryId: parsed.categoryId,
        durationMinutes: calculateOccurrenceDurationMinutes(
          occurrence.startMinutes,
          occurrence.endMinutes,
        ),
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return {
      attendance: toSafeAttendanceOccurrence(safeOccurrence, attendance),
      movement,
    };
  });
}
