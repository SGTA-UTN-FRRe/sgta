import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit-core";
import type { Database } from "@/db/client-core";
import {
  activity,
  administrativeCycle,
  career,
  hourCategory,
  hourMovement,
  tutor,
  tutorCycleMembership,
  user,
  type ActivityKind,
  type AdministrativeCycleStatus,
  type HourMovementDirection,
  type RecordStatus,
} from "@/db/schema";

import {
  hourCategoryStatusSchema,
  parseCreateHourCategoryInput,
  parseHourCategoryStatusTransitionInput,
  parseHourId,
  parseHourMovementHistoryInput,
  parseRecordBulkHourMovementInput,
  parseUpdateHourCategoryInput,
  normalizeHourCategoryName,
  type ParsedCreateHourCategoryInput,
  type ParsedHourMovementHistoryInput,
  type ParsedRecordBulkHourMovementInput,
  type ParsedUpdateHourCategoryInput,
} from "./hour-validation";

const movementActor = alias(user, "hour_movement_actor");
const activityActor = alias(user, "hour_activity_actor");

export const HOUR_ERROR_CODES = {
  validationError: "validation_error",
  queryFailed: "query_failed",
  transactionFailed: "transaction_failed",
  actorRequired: "actor_required",
  actorNotFound: "actor_not_found",
  cycleNotFound: "cycle_not_found",
  openCycleRequired: "open_cycle_required",
  cycleNotOpen: "cycle_not_open",
  movementDateOutsideCycle: "movement_date_outside_cycle",
  tutorNotFound: "tutor_not_found",
  inactiveTutor: "inactive_tutor",
  tutorNotInCycle: "tutor_not_in_cycle",
  categoryNotFound: "category_not_found",
  inactiveCategory: "inactive_category",
  duplicateCategoryName: "duplicate_category_name",
  statusAlreadySet: "status_already_set",
  activityCreditRequired: "activity_credit_required",
  recoveryCategoryRequired: "recovery_category_required",
  movementNotFound: "movement_not_found",
  movementAlreadyReversed: "movement_already_reversed",
  reversalTargetInvalid: "reversal_target_invalid",
} as const;

export type HourServiceErrorCode =
  (typeof HOUR_ERROR_CODES)[keyof typeof HOUR_ERROR_CODES];

export type HourValidationIssue = {
  code: string;
  path: Array<string | number>;
  message: string;
};

export type HourServiceErrorDetails = Record<
  string,
  string | number | null | string[]
>;

export class HourServiceError extends Error {
  readonly code: HourServiceErrorCode;
  readonly details?: HourServiceErrorDetails;
  readonly issues?: HourValidationIssue[];

  constructor(
    code: HourServiceErrorCode,
    message: string,
    options: {
      details?: HourServiceErrorDetails;
      issues?: HourValidationIssue[];
    } = {},
  ) {
    super(message);
    this.name = "HourServiceError";
    this.code = code;
    this.details = options.details;
    this.issues = options.issues;
  }
}

export type HourMutationContext = {
  actorId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
};

export type SafeHourCycle = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
};

export type SafeHourCategory = {
  id: string;
  name: string;
  activityKind: ActivityKind | null;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type SafeHourCategoryReference = Pick<
  SafeHourCategory,
  "id" | "name" | "activityKind" | "status"
>;

export type SafeHourTutor = {
  id: string;
  formalName: string;
  careerName: string;
  status: RecordStatus;
};

export type SafeHourBalance = {
  tutor: SafeHourTutor;
  cycle: SafeHourCycle;
  signedBalanceMinutes: number;
  state: "current" | "owes";
};

export type SafeHourActivityOrigin = {
  id: string;
  kind: ActivityKind;
  activityDate: string;
  durationMinutes: number;
  note: string | null;
  actor: {
    id: string;
    displayName: string;
  };
  createdAt: string;
};

export type SafeHourMovement = {
  id: string;
  tutor: SafeHourTutor;
  category: SafeHourCategoryReference;
  cycle: SafeHourCycle;
  direction: HourMovementDirection;
  durationMinutes: number;
  signedDurationMinutes: number;
  movementDate: string;
  note: string | null;
  actor: {
    id: string;
    displayName: string;
  };
  origin: SafeHourActivityOrigin | null;
  reversalOfMovementId: string | null;
  reversalMovementId: string | null;
  reversalState: "CONFIRMED" | "REVERSED" | "REVERSAL";
  createdAt: string;
};

export type SafeHourBulkMovementResult = {
  cycle: SafeHourCycle;
  origin: SafeHourActivityOrigin | null;
  movements: SafeHourMovement[];
};

export type SafeHourReversalResult = {
  original: SafeHourMovement;
  reversal: SafeHourMovement;
};

export type SafeHourWorkspace = {
  currentCycle: SafeHourCycle;
  balances: SafeHourBalance[];
  eligibleTutors: SafeHourTutor[];
  categories: SafeHourCategory[];
};

type SelectDatabase = Pick<Database, "select">;
export type HourMutationDatabase = Pick<
  Database,
  "select" | "insert" | "update"
>;
type MutationDatabase = HourMutationDatabase;

export type HourMovementOriginContext = {
  attendanceRecordId?: string | null;
  dutyOccurrenceId?: string | null;
};

type HourCycleRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AdministrativeCycleStatus;
};

type HourCategoryRow = {
  id: string;
  name: string;
  activityKind: ActivityKind | null;
  status: RecordStatus;
  createdAt: Date;
  updatedAt: Date;
};

type MovementQueryOptions = {
  cycleId: string;
  tutorId?: string;
  categoryId?: string;
  movementIds?: string[];
  offset?: number;
  limit?: number;
};

type HourMovementRow = {
  id: string;
  tutorId: string;
  tutorFirstName: string;
  tutorLastName: string;
  tutorStatus: RecordStatus;
  careerName: string;
  categoryId: string;
  categoryName: string;
  categoryActivityKind: ActivityKind | null;
  categoryStatus: RecordStatus;
  cycleId: string;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  cycleStatus: AdministrativeCycleStatus;
  direction: HourMovementDirection;
  durationMinutes: number;
  movementDate: string;
  note: string | null;
  activityId: string | null;
  activityKind: ActivityKind | null;
  activityDate: string | null;
  activityDurationMinutes: number | null;
  activityNote: string | null;
  activityActorId: string | null;
  activityActorName: string | null;
  activityCreatedAt: Date | null;
  reversalOfMovementId: string | null;
  actorId: string;
  actorName: string;
  createdAt: Date;
};

const hourCycleSelection = {
  id: administrativeCycle.id,
  name: administrativeCycle.name,
  startDate: administrativeCycle.startDate,
  endDate: administrativeCycle.endDate,
  status: administrativeCycle.status,
};

const hourCategorySelection = {
  id: hourCategory.id,
  name: hourCategory.name,
  activityKind: hourCategory.activityKind,
  status: hourCategory.status,
  createdAt: hourCategory.createdAt,
  updatedAt: hourCategory.updatedAt,
};

function toIso(value: Date) {
  return value.toISOString();
}

function toSafeCycle(row: HourCycleRow): SafeHourCycle {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
  };
}

function toSafeCategory(row: HourCategoryRow): SafeHourCategory {
  return {
    id: row.id,
    name: row.name,
    activityKind: row.activityKind,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toSafeTutor(row: {
  id: string;
  firstName: string;
  lastName: string;
  careerName: string;
  status: RecordStatus;
}): SafeHourTutor {
  return {
    id: row.id,
    formalName: `${row.lastName}, ${row.firstName}`,
    careerName: row.careerName,
    status: row.status,
  };
}

export function calculateSignedHourMinutes(
  direction: HourMovementDirection,
  durationMinutes: number,
) {
  return direction === "CREDIT" ? durationMinutes : -durationMinutes;
}

export function deriveHourBalanceState(signedBalanceMinutes: number) {
  return signedBalanceMinutes >= 0 ? ("current" as const) : ("owes" as const);
}

function parseServiceInput<T>(
  parser: (input: unknown) => T,
  input: unknown,
): T {
  try {
    return parser(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }

    throw error;
  }
}

function createValidationError(error: z.ZodError) {
  return new HourServiceError(
    HOUR_ERROR_CODES.validationError,
    "The hour input is invalid.",
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

function parseIdentifier(value: string, field: string) {
  try {
    return parseHourId(value);
  } catch {
    throw new HourServiceError(
      HOUR_ERROR_CODES.validationError,
      "The hour identifier is invalid.",
      { details: { field } },
    );
  }
}

function getDatabaseErrorProperty(error: unknown, property: "code" | "constraint") {
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

export function mapHourMutationError(error: unknown): HourServiceError {
  if (error instanceof HourServiceError) {
    return error;
  }

  const { code, constraint } = getDatabaseErrorInfo(error);
  const constraintName = constraint ?? "";

  if (code === "23505") {
    if (constraintName.includes("hour_category_normalized_name")) {
      return new HourServiceError(
        HOUR_ERROR_CODES.duplicateCategoryName,
        "The hour category name is already in use.",
      );
    }

    if (constraintName.includes("hour_movement_reversal")) {
      return new HourServiceError(
        HOUR_ERROR_CODES.movementAlreadyReversed,
        "The movement has already been reversed.",
      );
    }
  }

  if (code === "23503") {
    return new HourServiceError(
      HOUR_ERROR_CODES.transactionFailed,
      "The hour operation references data that is no longer available.",
    );
  }

  if (code === "23514" || code === "22P02") {
    return new HourServiceError(
      HOUR_ERROR_CODES.validationError,
      "The hour operation contains an invalid value.",
    );
  }

  return new HourServiceError(
    HOUR_ERROR_CODES.transactionFailed,
    "The hour operation could not be completed.",
  );
}

async function runMutation<T>(
  db: Database,
  operation: (transaction: MutationDatabase) => Promise<T>,
) {
  try {
    return await db.transaction((transaction) => operation(transaction));
  } catch (error) {
    throw mapHourMutationError(error);
  }
}

async function runQuery<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HourServiceError) {
      throw error;
    }

    throw new HourServiceError(
      HOUR_ERROR_CODES.queryFailed,
      "The hour data could not be loaded.",
    );
  }
}

async function getCycleRecord(
  db: SelectDatabase,
  cycleId: string,
  options: { lock?: boolean } = {},
) {
  if (options.lock === true) {
    const [row] = await db
      .select(hourCycleSelection)
      .from(administrativeCycle)
      .where(eq(administrativeCycle.id, cycleId))
      .limit(1)
      .for("update");

    return row;
  }

  const [row] = await db
    .select(hourCycleSelection)
    .from(administrativeCycle)
    .where(eq(administrativeCycle.id, cycleId))
    .limit(1);

  return row;
}

async function getOpenCycleRecord(db: SelectDatabase) {
  const [row] = await db
    .select(hourCycleSelection)
    .from(administrativeCycle)
    .where(eq(administrativeCycle.status, "OPEN"))
    .limit(1);

  return row;
}

async function requireCycleForWrite(
  db: SelectDatabase,
  cycleId: string,
  options: { lock?: boolean } = {},
): Promise<HourCycleRow> {
  const row = await getCycleRecord(db, cycleId, options);

  if (row === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.cycleNotFound,
      "The administrative cycle was not found.",
      { details: { cycleId } },
    );
  }

  if (row.status !== "OPEN") {
    throw new HourServiceError(
      HOUR_ERROR_CODES.cycleNotOpen,
      "Hour movements can only be recorded in an open administrative cycle.",
      { details: { cycleId, status: row.status } },
    );
  }

  return row;
}

async function requireCycleForRead(
  db: SelectDatabase,
  cycleId: string | undefined,
): Promise<HourCycleRow> {
  if (cycleId === undefined) {
    const row = await getOpenCycleRecord(db);

    if (row === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.openCycleRequired,
        "An open administrative cycle is required for this hour view.",
      );
    }

    return row;
  }

  const row = await getCycleRecord(db, cycleId);

  if (row === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.cycleNotFound,
      "The administrative cycle was not found.",
      { details: { cycleId } },
    );
  }

  return row;
}

function assertMovementDateWithinCycle(
  movementDate: string,
  cycle: HourCycleRow,
) {
  if (movementDate < cycle.startDate || movementDate > cycle.endDate) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.movementDateOutsideCycle,
      "The movement date must fall within the administrative cycle.",
      {
        details: {
          movementDate,
          cycleStartDate: cycle.startDate,
          cycleEndDate: cycle.endDate,
        },
      },
    );
  }
}

async function requireActor(db: SelectDatabase, actorId: string | null | undefined) {
  const normalizedActorId = actorId?.trim();

  if (normalizedActorId === undefined || normalizedActorId.length === 0) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.actorRequired,
      "An authenticated actor is required for hour changes.",
    );
  }

  const [actor] = await db
    .select({ id: user.id, displayName: user.name })
    .from(user)
    .where(eq(user.id, normalizedActorId))
    .limit(1);

  if (actor === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.actorNotFound,
      "The audit actor was not found.",
      { details: { actorId: normalizedActorId } },
    );
  }

  return actor;
}

async function getCategoryRecord(db: SelectDatabase, categoryId: string) {
  const [row] = await db
    .select(hourCategorySelection)
    .from(hourCategory)
    .where(eq(hourCategory.id, categoryId))
    .limit(1);

  return row;
}

async function requireActiveCategory(
  db: SelectDatabase,
  categoryId: string,
): Promise<HourCategoryRow> {
  const row = await getCategoryRecord(db, categoryId);

  if (row === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.categoryNotFound,
      "The hour category was not found.",
      { details: { categoryId } },
    );
  }

  if (row.status !== "ACTIVE") {
    throw new HourServiceError(
      HOUR_ERROR_CODES.inactiveCategory,
      "The selected hour category is inactive.",
      { details: { categoryId } },
    );
  }

  return row;
}

async function getEligibleTutorRows(
  db: SelectDatabase,
  cycleId: string,
  tutorIds?: string[],
) {
  const conditions: SQL[] = [
    eq(tutorCycleMembership.cycleId, cycleId),
  ];

  if (tutorIds !== undefined) {
    conditions.push(inArray(tutor.id, tutorIds));
  }

  return db
    .select({
      id: tutor.id,
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      careerName: career.name,
      status: tutor.status,
      membershipCycleId: tutorCycleMembership.cycleId,
    })
    .from(tutor)
    .innerJoin(career, eq(tutor.primaryCareerId, career.id))
    .leftJoin(
      tutorCycleMembership,
      and(
        eq(tutorCycleMembership.tutorId, tutor.id),
        eq(tutorCycleMembership.cycleId, cycleId),
      ),
    )
    .where(
      tutorIds === undefined
        ? eq(tutorCycleMembership.cycleId, cycleId)
        : and(...conditions),
    );
}

async function requireEligibleTutors(
  db: SelectDatabase,
  cycleId: string,
  tutorIds: string[],
): Promise<SafeHourTutor[]> {
  const rows = await getEligibleTutorRows(db, cycleId, tutorIds);
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  for (const tutorId of tutorIds) {
    const row = rowsById.get(tutorId);

    if (row === undefined) {
      const [existingTutor] = await db
        .select({ id: tutor.id, status: tutor.status })
        .from(tutor)
        .where(eq(tutor.id, tutorId))
        .limit(1);

      if (existingTutor === undefined) {
        throw new HourServiceError(
          HOUR_ERROR_CODES.tutorNotFound,
          "One of the selected Tutors was not found.",
          { details: { tutorId } },
        );
      }

      if (existingTutor.status !== "ACTIVE") {
        throw new HourServiceError(
          HOUR_ERROR_CODES.inactiveTutor,
          "One of the selected Tutors is inactive.",
          { details: { tutorId } },
        );
      }

      throw new HourServiceError(
        HOUR_ERROR_CODES.tutorNotInCycle,
        "One of the selected Tutors is not a member of the administrative cycle.",
        { details: { tutorId, cycleId } },
      );
    }

    if (row.status !== "ACTIVE") {
      throw new HourServiceError(
        HOUR_ERROR_CODES.inactiveTutor,
        "One of the selected Tutors is inactive.",
        { details: { tutorId } },
      );
    }

    if (row.membershipCycleId === null) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.tutorNotInCycle,
        "One of the selected Tutors is not a member of the administrative cycle.",
        { details: { tutorId, cycleId } },
      );
    }
  }

  return tutorIds.map((tutorId) => {
    const row = rowsById.get(tutorId);

    if (row === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.transactionFailed,
        "The selected Tutors could not be loaded.",
      );
    }

    return toSafeTutor(row);
  });
}

async function getMovementRows(
  db: SelectDatabase,
  options: MovementQueryOptions,
): Promise<HourMovementRow[]> {
  const conditions: SQL[] = [eq(hourMovement.cycleId, options.cycleId)];

  if (options.tutorId !== undefined) {
    conditions.push(eq(hourMovement.tutorId, options.tutorId));
  }

  if (options.categoryId !== undefined) {
    conditions.push(eq(hourMovement.categoryId, options.categoryId));
  }

  if (options.movementIds !== undefined) {
    conditions.push(inArray(hourMovement.id, options.movementIds));
  }

  return db
    .select({
      id: hourMovement.id,
      tutorId: tutor.id,
      tutorFirstName: tutor.firstName,
      tutorLastName: tutor.lastName,
      tutorStatus: tutor.status,
      careerName: career.name,
      categoryId: hourCategory.id,
      categoryName: hourCategory.name,
      categoryActivityKind: hourCategory.activityKind,
      categoryStatus: hourCategory.status,
      cycleId: administrativeCycle.id,
      cycleName: administrativeCycle.name,
      cycleStartDate: administrativeCycle.startDate,
      cycleEndDate: administrativeCycle.endDate,
      cycleStatus: administrativeCycle.status,
      direction: hourMovement.direction,
      durationMinutes: hourMovement.durationMinutes,
      movementDate: hourMovement.movementDate,
      note: hourMovement.note,
      activityId: activity.id,
      activityKind: activity.kind,
      activityDate: activity.activityDate,
      activityDurationMinutes: activity.durationMinutes,
      activityNote: activity.note,
      activityActorId: activityActor.id,
      activityActorName: activityActor.name,
      activityCreatedAt: activity.createdAt,
      reversalOfMovementId: hourMovement.reversalOfMovementId,
      actorId: movementActor.id,
      actorName: movementActor.name,
      createdAt: hourMovement.createdAt,
    })
    .from(hourMovement)
    .innerJoin(administrativeCycle, eq(hourMovement.cycleId, administrativeCycle.id))
    .innerJoin(tutor, eq(hourMovement.tutorId, tutor.id))
    .innerJoin(career, eq(tutor.primaryCareerId, career.id))
    .innerJoin(hourCategory, eq(hourMovement.categoryId, hourCategory.id))
    .innerJoin(movementActor, eq(hourMovement.actorId, movementActor.id))
    .leftJoin(activity, eq(hourMovement.activityId, activity.id))
    .leftJoin(activityActor, eq(activity.actorId, activityActor.id))
    .where(and(...conditions))
    .orderBy(desc(hourMovement.createdAt), desc(hourMovement.id))
    .limit(options.limit ?? 100)
    .offset(options.offset ?? 0);
}

function toSafeActivityOrigin(row: HourMovementRow): SafeHourActivityOrigin | null {
  if (
    row.activityId === null ||
    row.activityKind === null ||
    row.activityDate === null ||
    row.activityDurationMinutes === null ||
    row.activityActorId === null ||
    row.activityActorName === null ||
    row.activityCreatedAt === null
  ) {
    return null;
  }

  return {
    id: row.activityId,
    kind: row.activityKind,
    activityDate: row.activityDate,
    durationMinutes: row.activityDurationMinutes,
    note: row.activityNote,
    actor: {
      id: row.activityActorId,
      displayName: row.activityActorName,
    },
    createdAt: toIso(row.activityCreatedAt),
  };
}

function toSafeMovement(
  row: HourMovementRow,
  reversalMovementId: string | null,
): SafeHourMovement {
  const tutorRecord = {
    id: row.tutorId,
    firstName: row.tutorFirstName,
    lastName: row.tutorLastName,
    careerName: row.careerName,
    status: row.tutorStatus,
  };
  const cycleRecord: HourCycleRow = {
    id: row.cycleId,
    name: row.cycleName,
    startDate: row.cycleStartDate,
    endDate: row.cycleEndDate,
    status: row.cycleStatus,
  };
  const reversalState =
    row.reversalOfMovementId !== null
      ? "REVERSAL"
      : reversalMovementId === null
        ? "CONFIRMED"
        : "REVERSED";

  return {
    id: row.id,
    tutor: toSafeTutor(tutorRecord),
    category: {
      id: row.categoryId,
      name: row.categoryName,
      activityKind: row.categoryActivityKind,
      status: row.categoryStatus,
    },
    cycle: toSafeCycle(cycleRecord),
    direction: row.direction,
    durationMinutes: row.durationMinutes,
    signedDurationMinutes: calculateSignedHourMinutes(
      row.direction,
      row.durationMinutes,
    ),
    movementDate: row.movementDate,
    note: row.note,
    actor: {
      id: row.actorId,
      displayName: row.actorName,
    },
    origin: toSafeActivityOrigin(row),
    reversalOfMovementId: row.reversalOfMovementId,
    reversalMovementId,
    reversalState,
    createdAt: toIso(row.createdAt),
  };
}

async function toSafeMovements(
  db: SelectDatabase,
  rows: HourMovementRow[],
): Promise<SafeHourMovement[]> {
  const originalIds = rows
    .filter((row) => row.reversalOfMovementId === null)
    .map((row) => row.id);
  const reversalByOriginal = new Map<string, string>();

  if (originalIds.length > 0) {
    const reversals = await db
      .select({
        id: hourMovement.id,
        reversalOfMovementId: hourMovement.reversalOfMovementId,
      })
      .from(hourMovement)
      .where(inArray(hourMovement.reversalOfMovementId, originalIds));

    for (const reversal of reversals) {
      if (reversal.reversalOfMovementId !== null) {
        reversalByOriginal.set(
          reversal.reversalOfMovementId,
          reversal.id,
        );
      }
    }
  }

  return rows.map((row) =>
    toSafeMovement(row, reversalByOriginal.get(row.id) ?? null),
  );
}

async function listHourCategoriesInternal(
  db: SelectDatabase,
  status: "ALL" | RecordStatus,
): Promise<SafeHourCategory[]> {
  const rows = await db
    .select(hourCategorySelection)
    .from(hourCategory)
    .where(status === "ALL" ? undefined : eq(hourCategory.status, status))
    .orderBy(asc(hourCategory.normalizedName), asc(hourCategory.id));

  return rows.map(toSafeCategory);
}

async function listEligibleHourTutorsInternal(
  db: SelectDatabase,
  cycleId: string,
  activeOnly: boolean,
): Promise<SafeHourTutor[]> {
  const rows = await getEligibleTutorRows(db, cycleId);
  return rows
    .filter((row) => !activeOnly || row.status === "ACTIVE")
    .map(toSafeTutor);
}

async function listHourBalancesInternal(
  db: SelectDatabase,
  cycle: HourCycleRow,
  options: { activeOnly?: boolean } = {},
): Promise<SafeHourBalance[]> {
  const conditions: SQL[] = [
    eq(tutorCycleMembership.cycleId, cycle.id),
  ];

  if (options.activeOnly === true) {
    conditions.push(eq(tutor.status, "ACTIVE"));
  }

  const signedBalance = sql<string>`coalesce(
    sum(
      case
        when ${hourMovement.direction} = ${"CREDIT"} then ${hourMovement.durationMinutes}
        else -${hourMovement.durationMinutes}
      end
    ),
    0
  )::text`;

  const rows = await db
    .select({
      tutorId: tutor.id,
      tutorFirstName: tutor.firstName,
      tutorLastName: tutor.lastName,
      tutorStatus: tutor.status,
      careerName: career.name,
      signedBalance,
    })
    .from(tutor)
    .innerJoin(career, eq(tutor.primaryCareerId, career.id))
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
    .groupBy(
      tutor.id,
      tutor.firstName,
      tutor.lastName,
      tutor.status,
      career.name,
    )
    .orderBy(
      asc(sql`lower(${tutor.lastName})`),
      asc(sql`lower(${tutor.firstName})`),
      asc(tutor.id),
    );

  return rows.map((row) => {
    const signedBalanceMinutes = Number(row.signedBalance);

    return {
      tutor: toSafeTutor({
        id: row.tutorId,
        firstName: row.tutorFirstName,
        lastName: row.tutorLastName,
        careerName: row.careerName,
        status: row.tutorStatus,
      }),
      cycle: toSafeCycle(cycle),
      signedBalanceMinutes,
      state: deriveHourBalanceState(signedBalanceMinutes),
    };
  });
}

async function listHourMovementsInternal(
  db: SelectDatabase,
  filters: ParsedHourMovementHistoryInput,
): Promise<SafeHourMovement[]> {
  const cycle = await requireCycleForRead(db, filters.cycleId);
  const rows = await getMovementRows(db, {
    cycleId: cycle.id,
    tutorId: filters.tutorId,
    categoryId: filters.categoryId,
    offset: filters.offset,
    limit: filters.limit,
  });

  return toSafeMovements(db, rows);
}

async function getMovementById(
  db: SelectDatabase,
  cycleId: string,
  movementId: string,
): Promise<SafeHourMovement> {
  const rows = await getMovementRows(db, {
    cycleId,
    movementIds: [movementId],
    limit: 1,
  });
  const [movement] = await toSafeMovements(db, rows);

  if (movement === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.movementNotFound,
      "The hour movement was not found.",
      { details: { movementId } },
    );
  }

  return movement;
}

function createCategoryValues(
  parsed: ParsedCreateHourCategoryInput | ParsedUpdateHourCategoryInput,
  existingName?: string,
) {
  const displayName =
    parsed.name === undefined
      ? existingName
      : parsed.name.normalize("NFKC").trim().replace(/\s+/g, " ");

  if (displayName === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.validationError,
      "The hour category name is required.",
    );
  }

  return {
    name: displayName,
    normalizedName: normalizeHourCategoryName(displayName),
  };
}

async function recordMovementAudit(
  db: MutationDatabase,
  movementId: string,
  input: {
    actorId: string;
    requestId?: string | null;
    ipAddress?: string | null;
    cycleId: string;
    tutorId: string;
    categoryId: string;
    direction: HourMovementDirection;
    durationMinutes: number;
    movementDate: string;
    activityId: string | null;
    attendanceRecordId: string | null;
    reversalOfMovementId: string | null;
  },
) {
  await recordAuditEvent(db, {
    actorId: input.actorId,
    action: "hour_movement.created",
    entityType: "hour_movement",
    entityId: movementId,
    metadata: {
      cycleId: input.cycleId,
      tutorId: input.tutorId,
      categoryId: input.categoryId,
      direction: input.direction,
      durationMinutes: input.durationMinutes,
      movementDate: input.movementDate,
      activityId: input.activityId,
      attendanceRecordId: input.attendanceRecordId,
      reversalOfMovementId: input.reversalOfMovementId,
    },
    requestId: input.requestId ?? null,
    ipAddress: input.ipAddress ?? null,
  });
}

export async function getCurrentHourCycle(
  db: SelectDatabase,
): Promise<SafeHourCycle | null> {
  return runQuery(async () => {
    const row = await getOpenCycleRecord(db);
    return row === undefined ? null : toSafeCycle(row);
  });
}

export async function listHourCategories(
  db: SelectDatabase,
  status: "ALL" | RecordStatus = "ALL",
): Promise<SafeHourCategory[]> {
  let parsedStatus: "ALL" | RecordStatus;

  try {
    parsedStatus = hourCategoryStatusSchema.parse(status);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }

    throw error;
  }

  return runQuery(() => listHourCategoriesInternal(db, parsedStatus));
}

export async function getHourCategory(
  db: SelectDatabase,
  categoryId: string,
): Promise<SafeHourCategory> {
  const parsedCategoryId = parseIdentifier(categoryId, "categoryId");

  return runQuery(async () => {
    const row = await getCategoryRecord(db, parsedCategoryId);

    if (row === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.categoryNotFound,
        "The hour category was not found.",
        { details: { categoryId: parsedCategoryId } },
      );
    }

    return toSafeCategory(row);
  });
}

export async function createHourCategory(
  db: Database,
  input: unknown,
  context: HourMutationContext = {},
): Promise<SafeHourCategory> {
  const parsed = parseServiceInput(parseCreateHourCategoryInput, input);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const categoryValues = createCategoryValues(parsed);
    const [created] = await transaction
      .insert(hourCategory)
      .values({
        ...categoryValues,
        activityKind: parsed.activityKind,
        status: "ACTIVE",
      })
      .returning({ id: hourCategory.id });

    if (created === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.transactionFailed,
        "The hour category could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "hour_category.created",
      entityType: "hour_category",
      entityId: created.id,
      metadata: {
        activityKind: parsed.activityKind,
        status: "ACTIVE",
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getHourCategory(transaction, created.id);
  });
}

export async function updateHourCategory(
  db: Database,
  categoryId: string,
  input: unknown,
  context: HourMutationContext = {},
): Promise<SafeHourCategory> {
  const parsedCategoryId = parseIdentifier(categoryId, "categoryId");
  const parsed = parseServiceInput(parseUpdateHourCategoryInput, input);

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const existing = await getCategoryRecord(transaction, parsedCategoryId);

    if (existing === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.categoryNotFound,
        "The hour category was not found.",
        { details: { categoryId: parsedCategoryId } },
      );
    }

    const values: Partial<typeof hourCategory.$inferInsert> = {
      updatedAt: new Date(),
    };
    const changedFields: string[] = [];

    if (parsed.name !== undefined) {
      Object.assign(values, createCategoryValues(parsed, existing.name));
      changedFields.push("name");
    }

    if (parsed.activityKind !== undefined) {
      values.activityKind = parsed.activityKind;
      changedFields.push("activityKind");
    }

    await transaction
      .update(hourCategory)
      .set(values)
      .where(eq(hourCategory.id, parsedCategoryId));

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "hour_category.updated",
      entityType: "hour_category",
      entityId: parsedCategoryId,
      metadata: { changedFields },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getHourCategory(transaction, parsedCategoryId);
  });
}

export async function transitionHourCategoryStatus(
  db: Database,
  categoryId: string,
  input: unknown,
  context: HourMutationContext = {},
): Promise<SafeHourCategory> {
  const parsedCategoryId = parseIdentifier(categoryId, "categoryId");
  const parsed = parseServiceInput(
    parseHourCategoryStatusTransitionInput,
    input,
  );

  return runMutation(db, async (transaction) => {
    const actor = await requireActor(transaction, context.actorId);
    const existing = await getCategoryRecord(transaction, parsedCategoryId);

    if (existing === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.categoryNotFound,
        "The hour category was not found.",
        { details: { categoryId: parsedCategoryId } },
      );
    }

    if (existing.status === parsed.status) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.statusAlreadySet,
        "The hour category already has the requested status.",
        { details: { categoryId: parsedCategoryId, status: parsed.status } },
      );
    }

    await transaction
      .update(hourCategory)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(hourCategory.id, parsedCategoryId));

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "hour_category.status_changed",
      entityType: "hour_category",
      entityId: parsedCategoryId,
      metadata: {
        previousStatus: existing.status,
        status: parsed.status,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getHourCategory(transaction, parsedCategoryId);
  });
}

export const setHourCategoryStatus = transitionHourCategoryStatus;

export async function listHourBalances(
  db: SelectDatabase,
  cycleId: string,
  options: { activeOnly?: boolean } = {},
): Promise<SafeHourBalance[]> {
  const parsedCycleId = parseIdentifier(cycleId, "cycleId");

  return runQuery(async () => {
    const cycle = await requireCycleForRead(db, parsedCycleId);
    return listHourBalancesInternal(db, cycle, options);
  });
}

export async function listEligibleHourTutors(
  db: SelectDatabase,
  cycleId: string,
  options: { activeOnly?: boolean } = {},
): Promise<SafeHourTutor[]> {
  const parsedCycleId = parseIdentifier(cycleId, "cycleId");

  return runQuery(async () => {
    const cycle = await requireCycleForRead(db, parsedCycleId);
    return listEligibleHourTutorsInternal(
      db,
      cycle.id,
      options.activeOnly ?? false,
    );
  });
}

export async function listHourMovements(
  db: SelectDatabase,
  input: unknown = {},
): Promise<SafeHourMovement[]> {
  const parsed = parseServiceInput(parseHourMovementHistoryInput, input);
  return runQuery(() => listHourMovementsInternal(db, parsed));
}

export async function getHourWorkspace(
  db: SelectDatabase,
): Promise<SafeHourWorkspace> {
  return runQuery(async () => {
    const cycle = await requireCycleForRead(db, undefined);
    const [categories, eligibleTutors, balances] = await Promise.all([
      listHourCategoriesInternal(db, "ACTIVE"),
      listEligibleHourTutorsInternal(db, cycle.id, true),
      listHourBalancesInternal(db, cycle, { activeOnly: true }),
    ]);

    return {
      currentCycle: toSafeCycle(cycle),
      categories,
      eligibleTutors,
      balances,
    };
  });
}

export async function recordHourMovementInTransaction(
  db: HourMutationDatabase,
  parsed: ParsedRecordBulkHourMovementInput,
  context: HourMutationContext,
  requiredActivityKind?: ActivityKind,
  originContext: HourMovementOriginContext = {},
): Promise<SafeHourBulkMovementResult> {
  const actorId = context.actorId?.trim();

  if (actorId === undefined || actorId.length === 0) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.actorRequired,
      "An authenticated actor is required for hour changes.",
    );
  }

  const [actor, cycle] = await Promise.all([
    requireActor(db, actorId),
    requireCycleForWrite(db, parsed.cycleId, { lock: true }),
  ]);
  assertMovementDateWithinCycle(parsed.movementDate, cycle);

  const category = await requireActiveCategory(db, parsed.categoryId);

  if (
    requiredActivityKind !== undefined &&
    category.activityKind !== requiredActivityKind
  ) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.recoveryCategoryRequired,
      "The selected category is not configured for recovery recognition.",
      {
        details: {
          categoryId: category.id,
          requiredActivityKind,
        },
      },
    );
  }

  if (category.activityKind !== null && parsed.direction !== "CREDIT") {
    throw new HourServiceError(
      HOUR_ERROR_CODES.activityCreditRequired,
      "Activity and recovery origins require a credit movement.",
      { details: { categoryId: category.id } },
    );
  }

  await requireEligibleTutors(db, cycle.id, parsed.tutorIds);

  let activityId: string | null = null;
  if (category.activityKind !== null) {
    const [createdActivity] = await db
      .insert(activity)
      .values({
        cycleId: cycle.id,
        kind: category.activityKind,
        activityDate: parsed.movementDate,
        durationMinutes: parsed.duration,
        note: parsed.note,
        dutyOccurrenceId: originContext.dutyOccurrenceId ?? null,
        actorId: actor.id,
      })
      .returning({ id: activity.id });

    if (createdActivity === undefined) {
      throw new HourServiceError(
        HOUR_ERROR_CODES.transactionFailed,
        "The activity origin could not be created.",
      );
    }

    activityId = createdActivity.id;

    await recordAuditEvent(db, {
      actorId: actor.id,
      action: "activity.created",
      entityType: "activity",
      entityId: activityId,
      metadata: {
        cycleId: cycle.id,
        kind: category.activityKind,
        activityDate: parsed.movementDate,
        durationMinutes: parsed.duration,
        movementCount: parsed.tutorIds.length,
        dutyOccurrenceId: originContext.dutyOccurrenceId ?? null,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });
  }

  const createdMovements = await db
    .insert(hourMovement)
    .values(
      parsed.tutorIds.map((tutorId) => ({
        cycleId: cycle.id,
        tutorId,
        categoryId: category.id,
        direction: parsed.direction,
        durationMinutes: parsed.duration,
        movementDate: parsed.movementDate,
        note: parsed.note,
        activityId,
        attendanceRecordId: originContext.attendanceRecordId ?? null,
        reversalOfMovementId: null,
        actorId: actor.id,
      })),
    )
    .returning({ id: hourMovement.id, tutorId: hourMovement.tutorId });

  if (createdMovements.length !== parsed.tutorIds.length) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.transactionFailed,
      "The requested hour movements could not be created.",
    );
  }

  for (const movement of createdMovements) {
    await recordMovementAudit(db, movement.id, {
      actorId: actor.id,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      cycleId: cycle.id,
      tutorId: movement.tutorId,
      categoryId: category.id,
      direction: parsed.direction,
      durationMinutes: parsed.duration,
      movementDate: parsed.movementDate,
      activityId,
      attendanceRecordId: originContext.attendanceRecordId ?? null,
      reversalOfMovementId: null,
    });
  }

  const movementRows = await getMovementRows(db, {
    cycleId: cycle.id,
    movementIds: createdMovements.map((movement) => movement.id),
    limit: createdMovements.length,
  });
  const movements = await toSafeMovements(db, movementRows);

  if (movements.length !== createdMovements.length) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.transactionFailed,
      "The created hour movements could not be reloaded.",
    );
  }

  return {
    cycle: toSafeCycle(cycle),
    origin: movements[0]?.origin ?? null,
    movements,
  };
}

async function recordBulkHourMovementInternal(
  db: Database,
  parsed: ParsedRecordBulkHourMovementInput,
  context: HourMutationContext,
  requiredActivityKind?: ActivityKind,
  originContext: HourMovementOriginContext = {},
): Promise<SafeHourBulkMovementResult> {
  const actorId = context.actorId?.trim();

  if (actorId === undefined || actorId.length === 0) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.actorRequired,
      "An authenticated actor is required for hour changes.",
    );
  }

  return runMutation(db, (transaction) =>
    recordHourMovementInTransaction(
      transaction,
      parsed,
      context,
      requiredActivityKind,
      originContext,
    ),
  );
}

export async function recordBulkHourMovement(
  db: Database,
  input: unknown,
  context: HourMutationContext = {},
): Promise<SafeHourBulkMovementResult> {
  const parsed = parseServiceInput(parseRecordBulkHourMovementInput, input);
  return recordBulkHourMovementInternal(db, parsed, context);
}

export async function recognizeRecovery(
  db: Database,
  input: unknown,
  context: HourMutationContext = {},
): Promise<SafeHourBulkMovementResult> {
  const parsed = parseServiceInput(parseRecordBulkHourMovementInput, input);
  return recordBulkHourMovementInternal(db, parsed, context, "RECOVERY");
}

export async function reverseHourMovementInTransaction(
  db: HourMutationDatabase,
  parsedMovementId: string,
  context: HourMutationContext = {},
): Promise<SafeHourReversalResult> {
  const actorId = context.actorId?.trim();

  if (actorId === undefined || actorId.length === 0) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.actorRequired,
      "An authenticated actor is required for hour changes.",
    );
  }

  const actor = await requireActor(db, actorId);
  const [original] = await db
    .select({
      id: hourMovement.id,
      cycleId: hourMovement.cycleId,
      tutorId: hourMovement.tutorId,
      categoryId: hourMovement.categoryId,
      direction: hourMovement.direction,
      durationMinutes: hourMovement.durationMinutes,
      movementDate: hourMovement.movementDate,
      note: hourMovement.note,
      activityId: hourMovement.activityId,
      attendanceRecordId: hourMovement.attendanceRecordId,
      reversalOfMovementId: hourMovement.reversalOfMovementId,
    })
    .from(hourMovement)
    .where(eq(hourMovement.id, parsedMovementId))
    .limit(1)
    .for("update");

  if (original === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.movementNotFound,
      "The hour movement was not found.",
      { details: { movementId: parsedMovementId } },
    );
  }

  if (original.reversalOfMovementId !== null) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.reversalTargetInvalid,
      "A reversal movement cannot be reversed again.",
      { details: { movementId: parsedMovementId } },
    );
  }

  await requireCycleForWrite(db, original.cycleId, { lock: true });

  const [existingReversal] = await db
    .select({ id: hourMovement.id })
    .from(hourMovement)
    .where(eq(hourMovement.reversalOfMovementId, original.id))
    .limit(1);

  if (existingReversal !== undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.movementAlreadyReversed,
      "The movement has already been reversed.",
      {
        details: {
          movementId: original.id,
          reversalMovementId: existingReversal.id,
        },
      },
    );
  }

  const oppositeDirection: HourMovementDirection =
    original.direction === "CREDIT" ? "DEBIT" : "CREDIT";
  const [createdReversal] = await db
    .insert(hourMovement)
    .values({
      cycleId: original.cycleId,
      tutorId: original.tutorId,
      categoryId: original.categoryId,
      direction: oppositeDirection,
      durationMinutes: original.durationMinutes,
      movementDate: original.movementDate,
      note: original.note,
      activityId: original.activityId,
      attendanceRecordId: original.attendanceRecordId,
      reversalOfMovementId: original.id,
      actorId: actor.id,
    })
    .returning({ id: hourMovement.id });

  if (createdReversal === undefined) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.transactionFailed,
      "The movement reversal could not be created.",
    );
  }

  await recordAuditEvent(db, {
    actorId: actor.id,
    action: "hour_movement.reversed",
    entityType: "hour_movement",
    entityId: createdReversal.id,
    metadata: {
      reversalOfMovementId: original.id,
      cycleId: original.cycleId,
      tutorId: original.tutorId,
      categoryId: original.categoryId,
      direction: oppositeDirection,
      durationMinutes: original.durationMinutes,
      attendanceRecordId: original.attendanceRecordId,
    },
    requestId: context.requestId ?? null,
    ipAddress: context.ipAddress ?? null,
  });

  const [safeOriginal, safeReversal] = await Promise.all([
    getMovementById(db, original.cycleId, original.id),
    getMovementById(db, original.cycleId, createdReversal.id),
  ]);

  return {
    original: safeOriginal,
    reversal: safeReversal,
  };
}

export async function reverseHourMovement(
  db: Database,
  movementId: string,
  context: HourMutationContext = {},
): Promise<SafeHourReversalResult> {
  const parsedMovementId = parseIdentifier(movementId, "movementId");
  const actorId = context.actorId?.trim();

  if (actorId === undefined || actorId.length === 0) {
    throw new HourServiceError(
      HOUR_ERROR_CODES.actorRequired,
      "An authenticated actor is required for hour changes.",
    );
  }

  return runMutation(db, (transaction) =>
    reverseHourMovementInTransaction(transaction, parsedMovementId, context),
  );
}
