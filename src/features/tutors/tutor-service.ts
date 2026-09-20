import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";

import { recordAuditEvent } from "@/db/audit-core";
import type { Database } from "@/db/client-core";
import {
  administrativeCycle,
  career,
  scholarshipReference,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
  type RecordStatus,
} from "@/db/schema";

import {
  normalizeInstitutionalIdentifier,
  normalizeName,
  parseCreateCareerInput,
  parseCreateScholarshipReferenceInput,
  parseCreateSubjectInput,
  parseCreateTutorInput,
  parseStatusTransitionInput,
  parseTutorApplicationAccountInput,
  parseTutorSearchFilters,
  parseUpdateCareerInput,
  parseUpdateScholarshipReferenceInput,
  parseUpdateSubjectInput,
  parseUpdateTutorInput,
  type ParsedCreateCareerInput,
  type ParsedCreateScholarshipReferenceInput,
  type ParsedCreateSubjectInput,
  type ParsedCreateTutorInput,
  type ParsedStatusTransitionInput,
  type ParsedTutorSearchFilters,
  type ParsedUpdateCareerInput,
  type ParsedUpdateScholarshipReferenceInput,
  type ParsedUpdateSubjectInput,
  type ParsedUpdateTutorInput,
} from "./tutor-validation";

export const TUTOR_ERROR_CODES = {
  validationError: "validation_error",
  queryFailed: "query_failed",
  transactionFailed: "transaction_failed",
  tutorNotFound: "tutor_not_found",
  careerNotFound: "career_not_found",
  subjectNotFound: "subject_not_found",
  scholarshipReferenceNotFound: "scholarship_reference_not_found",
  cycleNotFound: "cycle_not_found",
  cycleNotOpen: "cycle_not_open",
  openCycleRequired: "open_cycle_required",
  cycleRequiredForMembershipChange: "cycle_required_for_membership_change",
  duplicateInstitutionalIdentifier: "duplicate_institutional_identifier",
  duplicateCareerName: "duplicate_career_name",
  duplicateSubjectName: "duplicate_subject_name",
  duplicateScholarshipReferenceType: "duplicate_scholarship_reference_type",
  duplicateSubjectAssignment: "duplicate_subject_assignment",
  duplicateCycleMembership: "duplicate_cycle_membership",
  applicationAccountNotFound: "application_account_not_found",
  applicationAccountNotTutor: "application_account_not_tutor",
  applicationAccountDisabled: "application_account_disabled",
  applicationAccountAlreadyLinked: "application_account_already_linked",
  careerSubjectMismatch: "career_subject_mismatch",
  catalogConflict: "catalog_conflict",
  inactiveCareer: "inactive_career",
  inactiveSubject: "inactive_subject",
  inactiveScholarshipReference: "inactive_scholarship_reference",
  invalidReferenceValue: "invalid_reference_value",
  invalidStatusTransition: "invalid_status_transition",
  statusAlreadySet: "status_already_set",
} as const;

export type TutorServiceErrorCode =
  (typeof TUTOR_ERROR_CODES)[keyof typeof TUTOR_ERROR_CODES];

export type TutorValidationIssue = {
  code: string;
  path: Array<string | number>;
  message: string;
};

export type TutorServiceErrorDetails = Record<
  string,
  string | number | null | string[]
>;

export class TutorServiceError extends Error {
  readonly code: TutorServiceErrorCode;
  readonly details?: TutorServiceErrorDetails;
  readonly issues?: TutorValidationIssue[];

  constructor(
    code: TutorServiceErrorCode,
    message: string,
    options: {
      details?: TutorServiceErrorDetails;
      issues?: TutorValidationIssue[];
    } = {},
  ) {
    super(message);
    this.name = "TutorServiceError";
    this.code = code;
    this.details = options.details;
    this.issues = options.issues;
  }
}

export type TutorMutationContext = {
  actorId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
};

export type SafeCycleContext = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
};

export type SafeCareer = {
  id: string;
  name: string;
  status: RecordStatus;
};

export type SafeSubject = {
  id: string;
  name: string;
  careerId: string;
  careerName: string;
  status: RecordStatus;
};

export type SafeScholarshipReference = {
  id: string;
  type: string;
  knownRequiredHours: number | null;
  notes: string | null;
  status: RecordStatus;
};

export type SafeTutorListItem = {
  id: string;
  formalName: string;
  firstName: string;
  lastName: string;
  preferredDisplayName: string | null;
  institutionalIdentifier: string | null;
  primaryCareer: SafeCareer;
  currentCycle: SafeCycleContext | null;
  currentCycleLabel: string | null;
  scholarshipReference: SafeScholarshipReference | null;
  subjectCount: number;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type SafeTutorCycleMembership = {
  cycle: SafeCycleContext;
  scholarshipReference: SafeScholarshipReference | null;
  createdAt: string;
  updatedAt: string;
};

export type SafeTutorDetail = SafeTutorListItem & {
  applicationAccount: {
    email: string;
    enabled: boolean;
  } | null;
  subjects: SafeSubject[];
  memberships: SafeTutorCycleMembership[];
};

export type SafeTutorCatalogOptions = {
  careers: SafeCareer[];
  subjects: SafeSubject[];
  scholarshipReferences: SafeScholarshipReference[];
  currentCycle: SafeCycleContext | null;
};

export type SafeSubjectCoverageTutor = {
  id: string;
  formalName: string;
  firstName: string;
  lastName: string;
  preferredDisplayName: string | null;
  institutionalIdentifier: string | null;
  status: RecordStatus;
};

export type SafeSubjectCoverage = {
  subject: {
    id: string;
    name: string;
    status: RecordStatus;
  };
  career: SafeCareer;
  tutors: SafeSubjectCoverageTutor[];
};

export type SafeSubjectCoverageResult = {
  currentCycle: SafeCycleContext | null;
  subjects: SafeSubjectCoverage[];
};

type SelectDatabase = Pick<Database, "select">;
type MutationDatabase = Pick<Database, "select" | "insert" | "update" | "delete">;

type CycleRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
};

type CurrentMembershipRow = {
  tutorId: string;
  cycleId: string;
  cycleName: string;
  cycleStartDate: string;
  cycleEndDate: string;
  cycleStatus: "OPEN" | "CLOSED";
  scholarshipReferenceId: string | null;
  scholarshipType: string | null;
  scholarshipKnownRequiredHours: number | null;
  scholarshipNotes: string | null;
  scholarshipStatus: RecordStatus | null;
};

type MembershipRow = CurrentMembershipRow & {
  createdAt: Date;
  updatedAt: Date;
};

function cleanDisplayText(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function toIso(value: Date) {
  return value.toISOString();
}

function toSafeCycle(row: CycleRow): SafeCycleContext {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
  };
}

function toSafeCareer(row: {
  id: string;
  name: string;
  status: RecordStatus;
}): SafeCareer {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
  };
}

function toSafeSubject(row: {
  id: string;
  name: string;
  careerId: string;
  careerName: string;
  status: RecordStatus;
}): SafeSubject {
  return {
    id: row.id,
    name: row.name,
    careerId: row.careerId,
    careerName: row.careerName,
    status: row.status,
  };
}

function toSafeScholarshipReference(row: {
  id: string;
  type: string;
  knownRequiredHours: number | null;
  notes: string | null;
  status: RecordStatus;
}): SafeScholarshipReference {
  return {
    id: row.id,
    type: row.type,
    knownRequiredHours: row.knownRequiredHours,
    notes: row.notes,
    status: row.status,
  };
}

function toSafeMembership(row: MembershipRow): SafeTutorCycleMembership {
  return {
    cycle: {
      id: row.cycleId,
      name: row.cycleName,
      startDate: row.cycleStartDate,
      endDate: row.cycleEndDate,
      status: row.cycleStatus,
    },
    scholarshipReference:
      row.scholarshipReferenceId === null ||
      row.scholarshipType === null ||
      row.scholarshipKnownRequiredHours === undefined ||
      row.scholarshipNotes === undefined ||
      row.scholarshipStatus === null
        ? null
        : toSafeScholarshipReference({
            id: row.scholarshipReferenceId,
            type: row.scholarshipType,
            knownRequiredHours: row.scholarshipKnownRequiredHours,
            notes: row.scholarshipNotes,
            status: row.scholarshipStatus,
          }),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

function toSafeTutorListItem(
  row: {
    id: string;
    firstName: string;
    lastName: string;
    preferredDisplayName: string | null;
    institutionalIdentifier: string | null;
    careerId: string;
    careerName: string;
    careerStatus: RecordStatus;
    status: RecordStatus;
    createdAt: Date;
    updatedAt: Date;
  },
  currentMembership: CurrentMembershipRow | undefined,
  subjectCount: number,
): SafeTutorListItem {
  const currentCycle =
    currentMembership === undefined
      ? null
      : {
          id: currentMembership.cycleId,
          name: currentMembership.cycleName,
          startDate: currentMembership.cycleStartDate,
          endDate: currentMembership.cycleEndDate,
          status: currentMembership.cycleStatus,
        };

  return {
    id: row.id,
    formalName: `${row.lastName}, ${row.firstName}`,
    firstName: row.firstName,
    lastName: row.lastName,
    preferredDisplayName: row.preferredDisplayName,
    institutionalIdentifier: row.institutionalIdentifier,
    primaryCareer: {
      id: row.careerId,
      name: row.careerName,
      status: row.careerStatus,
    },
    currentCycle,
    currentCycleLabel: currentCycle?.name ?? null,
    scholarshipReference:
      currentMembership === undefined ||
      currentMembership.scholarshipReferenceId === null ||
      currentMembership.scholarshipType === null ||
      currentMembership.scholarshipKnownRequiredHours === undefined ||
      currentMembership.scholarshipNotes === undefined ||
      currentMembership.scholarshipStatus === null
        ? null
        : toSafeScholarshipReference({
            id: currentMembership.scholarshipReferenceId,
            type: currentMembership.scholarshipType,
            knownRequiredHours: currentMembership.scholarshipKnownRequiredHours,
            notes: currentMembership.scholarshipNotes,
            status: currentMembership.scholarshipStatus,
          }),
    subjectCount,
    status: row.status,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
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

function createValidationError(
  error: z.ZodError,
  code: TutorServiceErrorCode = TUTOR_ERROR_CODES.validationError,
  message = "The tutor input is invalid.",
) {
  return new TutorServiceError(code, message, {
    issues: error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path.filter(
        (segment): segment is string | number =>
          typeof segment === "string" || typeof segment === "number",
      ),
      message: issue.message,
    })),
  });
}

function parseCreateTutorServiceInput(input: unknown): ParsedCreateTutorInput {
  try {
    return parseCreateTutorInput(input);
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some(
        (issue) => issue.path[0] === "cycleId" && issue.code === "invalid_type",
      )
    ) {
      throw createValidationError(
        error,
        TUTOR_ERROR_CODES.openCycleRequired,
        "An open administrative cycle is required to create a Tutor.",
      );
    }

    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }

    throw error;
  }
}

function parseUpdateTutorServiceInput(input: unknown): ParsedUpdateTutorInput {
  try {
    return parseUpdateTutorInput(input);
  } catch (error) {
    if (
      error instanceof z.ZodError &&
      error.issues.some(
        (issue) => issue.message === "cycleId is required when changing scholarshipReferenceId",
      )
    ) {
      throw createValidationError(
        error,
        TUTOR_ERROR_CODES.cycleRequiredForMembershipChange,
        "An open cycle must be named when changing scholarship membership.",
      );
    }

    if (error instanceof z.ZodError) {
      throw createValidationError(error);
    }

    throw error;
  }
}

function parseStatusTransitionServiceInput(
  input: unknown,
): ParsedStatusTransitionInput {
  try {
    return parseStatusTransitionInput(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createValidationError(
        error,
        TUTOR_ERROR_CODES.invalidStatusTransition,
        "The requested status transition is invalid.",
      );
    }

    throw error;
  }
}

function parseTutorId(tutorId: string) {
  try {
    return z.string().trim().uuid().parse(tutorId).toLowerCase();
  } catch {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.validationError,
      "The tutor identifier is invalid.",
      { details: { field: "tutorId" } },
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

function mapMutationError(error: unknown): TutorServiceError {
  if (error instanceof TutorServiceError) {
    return error;
  }

  const { code, constraint } = getDatabaseErrorInfo(error);
  const constraintName = constraint ?? "";

  if (code === "23505") {
    if (constraintName.includes("institutional_identifier")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateInstitutionalIdentifier,
        "The institutional identifier is already in use.",
      );
    }

    if (constraintName.includes("career_normalized_name")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateCareerName,
        "The Career name is already in use.",
      );
    }

    if (constraintName.includes("subject_career_normalized_name")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateSubjectName,
        "The Subject name is already in use for this Career.",
      );
    }

    if (constraintName.includes("scholarship_reference_normalized_type")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateScholarshipReferenceType,
        "The scholarship reference type is already in use.",
      );
    }

    if (constraintName.includes("tutor_subject")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateSubjectAssignment,
        "The Subject is already assigned to this Tutor.",
      );
    }

    if (constraintName.includes("tutor_cycle_membership")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateCycleMembership,
        "The Tutor is already a member of this cycle.",
      );
    }

    if (constraintName.includes("tutor_application_user_unique")) {
      return new TutorServiceError(
        TUTOR_ERROR_CODES.applicationAccountAlreadyLinked,
        "The application account is already linked to another Tutor.",
      );
    }
  }

  if (code === "23503") {
    return new TutorServiceError(
      TUTOR_ERROR_CODES.catalogConflict,
      "The requested relationship conflicts with existing academic data.",
    );
  }

  if (code === "23514" || code === "22P02") {
    return new TutorServiceError(
      TUTOR_ERROR_CODES.invalidReferenceValue,
      "The requested reference value is invalid.",
    );
  }

  return new TutorServiceError(
    TUTOR_ERROR_CODES.transactionFailed,
    "The tutor operation could not be completed.",
  );
}

async function runMutation<T>(
  db: Database,
  operation: (transaction: MutationDatabase) => Promise<T>,
) {
  try {
    return await db.transaction((transaction) => operation(transaction));
  } catch (error) {
    throw mapMutationError(error);
  }
}

async function runQuery<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TutorServiceError) {
      throw error;
    }

    throw new TutorServiceError(
      TUTOR_ERROR_CODES.queryFailed,
      "The tutor data could not be loaded.",
    );
  }
}

async function getCurrentCycleContext(
  db: SelectDatabase,
): Promise<SafeCycleContext | null> {
  const [row] = await db
    .select({
      id: administrativeCycle.id,
      name: administrativeCycle.name,
      startDate: administrativeCycle.startDate,
      endDate: administrativeCycle.endDate,
      status: administrativeCycle.status,
    })
    .from(administrativeCycle)
    .where(eq(administrativeCycle.status, "OPEN"))
    .limit(1);

  return row === undefined ? null : toSafeCycle(row);
}

async function getCurrentMemberships(
  db: SelectDatabase,
  tutorIds: string[],
): Promise<CurrentMembershipRow[]> {
  if (tutorIds.length === 0) {
    return [];
  }

  return db
    .select({
      tutorId: tutorCycleMembership.tutorId,
      cycleId: administrativeCycle.id,
      cycleName: administrativeCycle.name,
      cycleStartDate: administrativeCycle.startDate,
      cycleEndDate: administrativeCycle.endDate,
      cycleStatus: administrativeCycle.status,
      scholarshipReferenceId: scholarshipReference.id,
      scholarshipType: scholarshipReference.type,
      scholarshipKnownRequiredHours: scholarshipReference.knownRequiredHours,
      scholarshipNotes: scholarshipReference.notes,
      scholarshipStatus: scholarshipReference.status,
    })
    .from(tutorCycleMembership)
    .innerJoin(
      administrativeCycle,
      and(
        eq(tutorCycleMembership.cycleId, administrativeCycle.id),
        eq(administrativeCycle.status, "OPEN"),
      ),
    )
    .leftJoin(
      scholarshipReference,
      eq(tutorCycleMembership.scholarshipReferenceId, scholarshipReference.id),
    )
    .where(inArray(tutorCycleMembership.tutorId, tutorIds));
}

async function getSubjectCounts(
  db: SelectDatabase,
  tutorIds: string[],
): Promise<Map<string, number>> {
  if (tutorIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      tutorId: tutorSubject.tutorId,
      subjectCount: sql<number>`count(*)::int`,
    })
    .from(tutorSubject)
    .where(inArray(tutorSubject.tutorId, tutorIds))
    .groupBy(tutorSubject.tutorId);

  return new Map(rows.map((row) => [row.tutorId, Number(row.subjectCount)]));
}

async function getTutorRecord(db: SelectDatabase, tutorId: string) {
  const [row] = await db
    .select({
      id: tutor.id,
      applicationUserId: tutor.applicationUserId,
      applicationUserEmail: user.email,
      applicationUserEnabled: user.enabled,
      firstName: tutor.firstName,
      lastName: tutor.lastName,
      preferredDisplayName: tutor.preferredDisplayName,
      institutionalIdentifier: tutor.institutionalIdentifier,
      primaryCareerId: tutor.primaryCareerId,
      status: tutor.status,
      createdAt: tutor.createdAt,
      updatedAt: tutor.updatedAt,
      careerId: career.id,
      careerName: career.name,
      careerStatus: career.status,
    })
    .from(tutor)
    .innerJoin(career, eq(tutor.primaryCareerId, career.id))
    .leftJoin(user, eq(tutor.applicationUserId, user.id))
    .where(eq(tutor.id, tutorId))
    .limit(1);

  return row;
}

async function getTutorSubjectRecords(db: SelectDatabase, tutorId: string) {
  return db
    .select({
      id: subject.id,
      name: subject.name,
      careerId: career.id,
      careerName: career.name,
      status: subject.status,
    })
    .from(tutorSubject)
    .innerJoin(subject, eq(tutorSubject.subjectId, subject.id))
    .innerJoin(career, eq(subject.careerId, career.id))
    .where(eq(tutorSubject.tutorId, tutorId))
    .orderBy(asc(career.normalizedName), asc(subject.normalizedName), asc(subject.id));
}

async function getTutorMembershipRecords(
  db: SelectDatabase,
  tutorId: string,
): Promise<MembershipRow[]> {
  return db
    .select({
      tutorId: tutorCycleMembership.tutorId,
      cycleId: administrativeCycle.id,
      cycleName: administrativeCycle.name,
      cycleStartDate: administrativeCycle.startDate,
      cycleEndDate: administrativeCycle.endDate,
      cycleStatus: administrativeCycle.status,
      scholarshipReferenceId: scholarshipReference.id,
      scholarshipType: scholarshipReference.type,
      scholarshipKnownRequiredHours: scholarshipReference.knownRequiredHours,
      scholarshipNotes: scholarshipReference.notes,
      scholarshipStatus: scholarshipReference.status,
      createdAt: tutorCycleMembership.createdAt,
      updatedAt: tutorCycleMembership.updatedAt,
    })
    .from(tutorCycleMembership)
    .innerJoin(
      administrativeCycle,
      eq(tutorCycleMembership.cycleId, administrativeCycle.id),
    )
    .leftJoin(
      scholarshipReference,
      eq(tutorCycleMembership.scholarshipReferenceId, scholarshipReference.id),
    )
    .where(eq(tutorCycleMembership.tutorId, tutorId))
    .orderBy(
      desc(administrativeCycle.startDate),
      desc(tutorCycleMembership.createdAt),
      asc(administrativeCycle.id),
    );
}

export async function listTutors(
  db: SelectDatabase,
  input: unknown = {},
): Promise<SafeTutorListItem[]> {
  const filters = parseServiceInput(parseTutorSearchFilters, input);

  return runQuery(async () => {
    const conditions: SQL[] = [];

    if (filters.status !== "ALL") {
      conditions.push(eq(tutor.status, filters.status));
    }

    if (filters.careerId !== undefined) {
      conditions.push(eq(tutor.primaryCareerId, filters.careerId));
    }

    if (filters.search.length > 0) {
      const pattern = `%${filters.search.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(
        or(
          ilike(tutor.firstName, pattern),
          ilike(tutor.lastName, pattern),
          ilike(tutor.preferredDisplayName, pattern),
          ilike(tutor.institutionalIdentifier, pattern),
          ilike(career.name, pattern),
          ilike(
            sql`${tutor.lastName} || ', ' || ${tutor.firstName}`,
            pattern,
          ),
        )!,
      );
    }

    const rows = await db
      .select({
        id: tutor.id,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        preferredDisplayName: tutor.preferredDisplayName,
        institutionalIdentifier: tutor.institutionalIdentifier,
        status: tutor.status,
        createdAt: tutor.createdAt,
        updatedAt: tutor.updatedAt,
        careerId: career.id,
        careerName: career.name,
        careerStatus: career.status,
      })
      .from(tutor)
      .innerJoin(career, eq(tutor.primaryCareerId, career.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        asc(sql`lower(${tutor.lastName})`),
        asc(sql`lower(${tutor.firstName})`),
        asc(tutor.id),
      )
      .limit(filters.limit)
      .offset(filters.offset);

    const tutorIds = rows.map((row) => row.id);
    const [currentMemberships, subjectCounts] = await Promise.all([
      getCurrentMemberships(db, tutorIds),
      getSubjectCounts(db, tutorIds),
    ]);
    const membershipByTutor = new Map(
      currentMemberships.map((membership) => [membership.tutorId, membership]),
    );

    return rows.map((row) =>
      toSafeTutorListItem(
        row,
        membershipByTutor.get(row.id),
        subjectCounts.get(row.id) ?? 0,
      ),
    );
  });
}

export async function getTutorDetail(
  db: SelectDatabase,
  tutorId: string,
): Promise<SafeTutorDetail> {
  const parsedTutorId = parseTutorId(tutorId);

  return runQuery(async () => {
    const row = await getTutorRecord(db, parsedTutorId);

    if (row === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.tutorNotFound,
        "The Tutor was not found.",
      );
    }

    const [subjectRows, membershipRows] = await Promise.all([
      getTutorSubjectRecords(db, parsedTutorId),
      getTutorMembershipRecords(db, parsedTutorId),
    ]);
    const currentMembership = membershipRows.find(
      (membership) => membership.cycleStatus === "OPEN",
    );
    const listItem = toSafeTutorListItem(
      row,
      currentMembership,
      subjectRows.length,
    );

    return {
      ...listItem,
      applicationAccount:
        row.applicationUserId === null ||
        row.applicationUserEmail === null ||
        row.applicationUserEnabled === null
          ? null
          : {
              email: row.applicationUserEmail,
              enabled: row.applicationUserEnabled,
            },
      subjects: subjectRows.map(toSafeSubject),
      memberships: membershipRows.map(toSafeMembership),
    };
  });
}

export const getTutor = getTutorDetail;

export async function listCareers(
  db: SelectDatabase,
  status: RecordStatus | "ALL" = "ALL",
): Promise<SafeCareer[]> {
  return runQuery(async () => {
    const rows = await db
      .select({ id: career.id, name: career.name, status: career.status })
      .from(career)
      .where(status === "ALL" ? undefined : eq(career.status, status))
      .orderBy(asc(career.normalizedName), asc(career.id));

    return rows.map(toSafeCareer);
  });
}

export async function listSubjects(
  db: SelectDatabase,
  status: RecordStatus | "ALL" = "ALL",
  options: { activeCareerOnly?: boolean } = {},
): Promise<SafeSubject[]> {
  return runQuery(async () => {
    const conditions: SQL[] = [];

    if (status !== "ALL") {
      conditions.push(eq(subject.status, status));
    }

    if (options.activeCareerOnly === true) {
      conditions.push(eq(career.status, "ACTIVE"));
    }

    const rows = await db
      .select({
        id: subject.id,
        name: subject.name,
        careerId: career.id,
        careerName: career.name,
        status: subject.status,
      })
      .from(subject)
      .innerJoin(career, eq(subject.careerId, career.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        asc(career.normalizedName),
        asc(subject.normalizedName),
        asc(subject.id),
      );

    return rows.map(toSafeSubject);
  });
}

export async function listScholarshipReferences(
  db: SelectDatabase,
  status: RecordStatus | "ALL" = "ALL",
): Promise<SafeScholarshipReference[]> {
  return runQuery(async () => {
    const rows = await db
      .select({
        id: scholarshipReference.id,
        type: scholarshipReference.type,
        knownRequiredHours: scholarshipReference.knownRequiredHours,
        notes: scholarshipReference.notes,
        status: scholarshipReference.status,
      })
      .from(scholarshipReference)
      .where(
        status === "ALL"
          ? undefined
          : eq(scholarshipReference.status, status),
      )
      .orderBy(
        asc(scholarshipReference.normalizedType),
        asc(scholarshipReference.id),
      );

    return rows.map(toSafeScholarshipReference);
  });
}

export async function getActiveCatalogOptions(
  db: SelectDatabase,
): Promise<SafeTutorCatalogOptions> {
  return runQuery(async () => {
    const [careers, subjects, scholarshipReferences, currentCycle] =
      await Promise.all([
        listCareers(db, "ACTIVE"),
        listSubjects(db, "ACTIVE", { activeCareerOnly: true }),
        listScholarshipReferences(db, "ACTIVE"),
        getCurrentCycleContext(db),
      ]);

    return { careers, subjects, scholarshipReferences, currentCycle };
  });
}

export const getTutorCatalogOptions = getActiveCatalogOptions;

export async function listSubjectCoverage(
  db: SelectDatabase,
): Promise<SafeSubjectCoverageResult> {
  return runQuery(async () => {
    const currentCycle = await getCurrentCycleContext(db);

    if (currentCycle === null) {
      return { currentCycle: null, subjects: [] };
    }

    const rows = await db
      .select({
        subjectId: subject.id,
        subjectName: subject.name,
        subjectStatus: subject.status,
        careerId: career.id,
        careerName: career.name,
        careerStatus: career.status,
        tutorId: tutor.id,
        tutorFirstName: tutor.firstName,
        tutorLastName: tutor.lastName,
        tutorPreferredDisplayName: tutor.preferredDisplayName,
        tutorInstitutionalIdentifier: tutor.institutionalIdentifier,
        tutorStatus: tutor.status,
      })
      .from(tutorSubject)
      .innerJoin(subject, eq(tutorSubject.subjectId, subject.id))
      .innerJoin(career, eq(subject.careerId, career.id))
      .innerJoin(tutor, eq(tutorSubject.tutorId, tutor.id))
      .innerJoin(
        tutorCycleMembership,
        and(
          eq(tutorCycleMembership.tutorId, tutor.id),
          eq(tutorCycleMembership.cycleId, currentCycle.id),
        ),
      )
      .where(
        and(
          eq(subject.status, "ACTIVE"),
          eq(career.status, "ACTIVE"),
          eq(tutor.status, "ACTIVE"),
        ),
      )
      .orderBy(
        asc(career.normalizedName),
        asc(subject.normalizedName),
        asc(subject.id),
        asc(sql`lower(${tutor.lastName})`),
        asc(sql`lower(${tutor.firstName})`),
        asc(tutor.id),
      );

    const grouped = new Map<string, SafeSubjectCoverage>();

    for (const row of rows) {
      const existing = grouped.get(row.subjectId);
      const coverageTutor: SafeSubjectCoverageTutor = {
        id: row.tutorId,
        formalName: `${row.tutorLastName}, ${row.tutorFirstName}`,
        firstName: row.tutorFirstName,
        lastName: row.tutorLastName,
        preferredDisplayName: row.tutorPreferredDisplayName,
        institutionalIdentifier: row.tutorInstitutionalIdentifier,
        status: row.tutorStatus,
      };

      if (existing === undefined) {
        grouped.set(row.subjectId, {
          subject: {
            id: row.subjectId,
            name: row.subjectName,
            status: row.subjectStatus,
          },
          career: {
            id: row.careerId,
            name: row.careerName,
            status: row.careerStatus,
          },
          tutors: [coverageTutor],
        });
      } else {
        existing.tutors.push(coverageTutor);
      }
    }

    return {
      currentCycle,
      subjects: [...grouped.values()],
    };
  });
}

export const getSubjectCoverage = listSubjectCoverage;

async function requireActiveCareer(db: MutationDatabase, careerId: string) {
  const [row] = await db
    .select({ id: career.id, name: career.name, status: career.status })
    .from(career)
    .where(eq(career.id, careerId))
    .limit(1);

  if (row === undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.careerNotFound,
      "The Career was not found.",
      { details: { careerId } },
    );
  }

  if (row.status !== "ACTIVE") {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.inactiveCareer,
      "The selected Career is inactive.",
      { details: { careerId } },
    );
  }

  return row;
}

async function requireActiveSubjects(
  db: MutationDatabase,
  subjectIds: string[],
  careerId: string,
) {
  if (subjectIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      id: subject.id,
      name: subject.name,
      careerId: subject.careerId,
      status: subject.status,
    })
    .from(subject)
    .where(inArray(subject.id, subjectIds));
  const foundIds = new Set(rows.map((row) => row.id));
  const missingId = subjectIds.find((id) => !foundIds.has(id));

  if (missingId !== undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.subjectNotFound,
      "A selected Subject was not found.",
      { details: { subjectId: missingId } },
    );
  }

  const inactive = rows.find((row) => row.status !== "ACTIVE");

  if (inactive !== undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.inactiveSubject,
      "A selected Subject is inactive.",
      { details: { subjectId: inactive.id } },
    );
  }

  const mismatched = rows.find((row) => row.careerId !== careerId);

  if (mismatched !== undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.careerSubjectMismatch,
      "Every selected Subject must belong to the primary Career.",
      { details: { subjectId: mismatched.id, careerId } },
    );
  }

  return rows;
}

async function requireOpenCycle(db: MutationDatabase, cycleId: string) {
  const [row] = await db
    .select({
      id: administrativeCycle.id,
      name: administrativeCycle.name,
      startDate: administrativeCycle.startDate,
      endDate: administrativeCycle.endDate,
      status: administrativeCycle.status,
    })
    .from(administrativeCycle)
    .where(eq(administrativeCycle.id, cycleId))
    .limit(1);

  if (row === undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.cycleNotFound,
      "The administrative cycle was not found.",
      { details: { cycleId } },
    );
  }

  if (row.status !== "OPEN") {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.cycleNotOpen,
      "The administrative cycle is not open.",
      { details: { cycleId } },
    );
  }

  return row;
}

async function findCurrentMembership(
  db: MutationDatabase,
  tutorId: string,
) {
  const [row] = await db
    .select({
      tutorId: tutorCycleMembership.tutorId,
      cycleId: tutorCycleMembership.cycleId,
      scholarshipReferenceId: tutorCycleMembership.scholarshipReferenceId,
    })
    .from(tutorCycleMembership)
    .innerJoin(
      administrativeCycle,
      and(
        eq(tutorCycleMembership.cycleId, administrativeCycle.id),
        eq(administrativeCycle.status, "OPEN"),
      ),
    )
    .where(eq(tutorCycleMembership.tutorId, tutorId))
    .limit(1);

  return row;
}

async function requireActiveScholarshipReference(
  db: MutationDatabase,
  scholarshipReferenceId: string | null,
) {
  if (scholarshipReferenceId === null) {
    return null;
  }

  const [row] = await db
    .select({
      id: scholarshipReference.id,
      type: scholarshipReference.type,
      knownRequiredHours: scholarshipReference.knownRequiredHours,
      notes: scholarshipReference.notes,
      status: scholarshipReference.status,
    })
    .from(scholarshipReference)
    .where(eq(scholarshipReference.id, scholarshipReferenceId))
    .limit(1);

  if (row === undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.scholarshipReferenceNotFound,
      "The scholarship reference was not found.",
      { details: { scholarshipReferenceId } },
    );
  }

  if (row.status !== "ACTIVE") {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.inactiveScholarshipReference,
      "The selected scholarship reference is inactive.",
      { details: { scholarshipReferenceId } },
    );
  }

  return row;
}

async function getTutorSubjectIds(db: MutationDatabase, tutorId: string) {
  const rows = await db
    .select({ subjectId: tutorSubject.subjectId })
    .from(tutorSubject)
    .where(eq(tutorSubject.tutorId, tutorId));

  return rows.map((row) => row.subjectId);
}

async function syncTutorSubjects(
  db: MutationDatabase,
  tutorId: string,
  subjectIds: string[],
) {
  const existingIds = await getTutorSubjectIds(db, tutorId);
  const requestedIds = new Set(subjectIds);
  const existingIdSet = new Set(existingIds);
  const removedSubjectIds = existingIds.filter((id) => !requestedIds.has(id));
  const addedSubjectIds = subjectIds.filter((id) => !existingIdSet.has(id));

  if (removedSubjectIds.length > 0) {
    await db
      .delete(tutorSubject)
      .where(
        and(
          eq(tutorSubject.tutorId, tutorId),
          inArray(tutorSubject.subjectId, removedSubjectIds),
        ),
      );
  }

  if (addedSubjectIds.length > 0) {
    await db.insert(tutorSubject).values(
      addedSubjectIds.map((subjectId) => ({
        tutorId,
        subjectId,
      })),
    );
  }

  return { addedSubjectIds, removedSubjectIds };
}

function normalizedNullableIdentifier(value: string | null | undefined) {
  return value === null || value === undefined
    ? null
    : normalizeInstitutionalIdentifier(value);
}

async function resolveApplicationAccount(
  db: MutationDatabase,
  email: string,
  currentTutorId?: string,
) {
  const [applicationAccount] = await db
    .select({
      id: user.id,
      email: user.email,
      role: user.role,
      enabled: user.enabled,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (applicationAccount === undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.applicationAccountNotFound,
      "The provisioned application account was not found.",
    );
  }

  if (applicationAccount.role !== "TUTOR") {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.applicationAccountNotTutor,
      "The application account is not provisioned as a Tutor.",
    );
  }

  if (!applicationAccount.enabled) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.applicationAccountDisabled,
      "The application account is disabled.",
    );
  }

  const linkedTutorConditions: SQL[] = [
    eq(tutor.applicationUserId, applicationAccount.id),
  ];

  if (currentTutorId !== undefined) {
    linkedTutorConditions.push(ne(tutor.id, currentTutorId));
  }

  const [linkedTutor] = await db
    .select({ id: tutor.id })
    .from(tutor)
    .where(and(...linkedTutorConditions))
    .limit(1);

  if (linkedTutor !== undefined) {
    throw new TutorServiceError(
      TUTOR_ERROR_CODES.applicationAccountAlreadyLinked,
      "The application account is already linked to another Tutor.",
    );
  }

  return applicationAccount;
}

type ApplicationAccountChange = {
  previousUserId: string | null;
  nextUserId: string | null;
};

async function recordApplicationAccountChange(
  db: MutationDatabase,
  tutorId: string,
  change: ApplicationAccountChange,
  context: TutorMutationContext,
) {
  if (change.previousUserId !== null) {
    await recordAuditEvent(db, {
      actorId: context.actorId ?? null,
      action: "tutor.application_account_unlinked",
      entityType: "tutor",
      entityId: tutorId,
      metadata: { applicationUserId: change.previousUserId },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });
  }

  if (change.nextUserId !== null) {
    await recordAuditEvent(db, {
      actorId: context.actorId ?? null,
      action: "tutor.application_account_linked",
      entityType: "tutor",
      entityId: tutorId,
      metadata: { applicationUserId: change.nextUserId },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });
  }
}

export async function setTutorApplicationAccount(
  db: Database,
  tutorId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeTutorDetail> {
  const parsedTutorId = parseTutorId(tutorId);
  const parsed = parseServiceInput(parseTutorApplicationAccountInput, input);

  return runMutation(db, async (transaction) => {
    const [existing] = await transaction
      .select({ id: tutor.id, applicationUserId: tutor.applicationUserId })
      .from(tutor)
      .where(eq(tutor.id, parsedTutorId))
      .limit(1);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.tutorNotFound,
        "The Tutor was not found.",
        { details: { tutorId: parsedTutorId } },
      );
    }

    const nextApplicationAccount =
      parsed.applicationEmail === null
        ? null
        : await resolveApplicationAccount(
            transaction,
            parsed.applicationEmail,
            parsedTutorId,
          );
    const nextUserId = nextApplicationAccount?.id ?? null;

    if (nextUserId !== existing.applicationUserId) {
      await transaction
        .update(tutor)
        .set({ applicationUserId: nextUserId, updatedAt: new Date() })
        .where(eq(tutor.id, parsedTutorId));

      await recordApplicationAccountChange(
        transaction,
        parsedTutorId,
        {
          previousUserId: existing.applicationUserId,
          nextUserId,
        },
        context,
      );
    }

    return getTutorDetail(transaction, parsedTutorId);
  });
}

export async function createTutor(
  db: Database,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeTutorDetail> {
  const parsed = parseCreateTutorServiceInput(input);

  return runMutation(db, async (transaction) => {
    const applicationAccount =
      parsed.applicationEmail === undefined || parsed.applicationEmail === null
        ? null
        : await resolveApplicationAccount(transaction, parsed.applicationEmail);

    await requireActiveCareer(transaction, parsed.primaryCareerId);
    await requireActiveSubjects(
      transaction,
      parsed.subjectIds,
      parsed.primaryCareerId,
    );
    await requireOpenCycle(transaction, parsed.cycleId);
    await requireActiveScholarshipReference(
      transaction,
      parsed.scholarshipReferenceId,
    );

    const [created] = await transaction
      .insert(tutor)
      .values({
        applicationUserId: applicationAccount?.id ?? null,
        firstName: cleanDisplayText(parsed.firstName),
        lastName: cleanDisplayText(parsed.lastName),
        preferredDisplayName:
          parsed.preferredDisplayName === null ||
          parsed.preferredDisplayName === undefined
            ? null
            : cleanDisplayText(parsed.preferredDisplayName),
        institutionalIdentifier: parsed.institutionalIdentifier,
        normalizedInstitutionalIdentifier: normalizedNullableIdentifier(
          parsed.institutionalIdentifier,
        ),
        primaryCareerId: parsed.primaryCareerId,
        status: "ACTIVE",
      })
      .returning({ id: tutor.id });

    if (created === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.transactionFailed,
        "The Tutor could not be created.",
      );
    }

    if (parsed.subjectIds.length > 0) {
      await transaction.insert(tutorSubject).values(
        parsed.subjectIds.map((subjectId) => ({
          tutorId: created.id,
          subjectId,
        })),
      );
    }

    await transaction.insert(tutorCycleMembership).values({
      tutorId: created.id,
      cycleId: parsed.cycleId,
      scholarshipReferenceId: parsed.scholarshipReferenceId,
    });

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "tutor.created",
      entityType: "tutor",
      entityId: created.id,
      metadata: {
        status: "ACTIVE",
        primaryCareerId: parsed.primaryCareerId,
        subjectIds: parsed.subjectIds,
        cycleId: parsed.cycleId,
        scholarshipReferenceId: parsed.scholarshipReferenceId,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    if (applicationAccount !== null) {
      await recordApplicationAccountChange(
        transaction,
        created.id,
        { previousUserId: null, nextUserId: applicationAccount.id },
        context,
      );
    }

    return getTutorDetail(transaction, created.id);
  });
}

export async function updateTutor(
  db: Database,
  tutorId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeTutorDetail> {
  const parsedTutorId = parseTutorId(tutorId);
  const parsed = parseUpdateTutorServiceInput(input);

  if (
    Object.keys(parsed).length === 1 &&
    parsed.applicationEmail !== undefined
  ) {
    return setTutorApplicationAccount(db, parsedTutorId, parsed, context);
  }

  return runMutation(db, async (transaction) => {
    const [existing] = await transaction
      .select({
        id: tutor.id,
        firstName: tutor.firstName,
        lastName: tutor.lastName,
        preferredDisplayName: tutor.preferredDisplayName,
        institutionalIdentifier: tutor.institutionalIdentifier,
        applicationUserId: tutor.applicationUserId,
        primaryCareerId: tutor.primaryCareerId,
        status: tutor.status,
      })
      .from(tutor)
      .where(eq(tutor.id, parsedTutorId))
      .limit(1);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.tutorNotFound,
        "The Tutor was not found.",
        { details: { tutorId: parsedTutorId } },
      );
    }

    const targetCareerId = parsed.primaryCareerId ?? existing.primaryCareerId;
    await requireActiveCareer(transaction, targetCareerId);

    let subjectIdsForValidation: string[] | undefined;
    if (parsed.subjectIds !== undefined) {
      subjectIdsForValidation = parsed.subjectIds;
    } else if (parsed.primaryCareerId !== undefined) {
      subjectIdsForValidation = await getTutorSubjectIds(
        transaction,
        parsedTutorId,
      );
    }

    if (subjectIdsForValidation !== undefined) {
      await requireActiveSubjects(
        transaction,
        subjectIdsForValidation,
        targetCareerId,
      );
    }

    const changedFields: string[] = [];
    const values: Partial<typeof tutor.$inferInsert> = {
      updatedAt: new Date(),
    };
    let applicationAccountChange: {
      previousUserId: string | null;
      nextUserId: string | null;
    } | null = null;

    if (parsed.applicationEmail !== undefined) {
      const nextApplicationAccount =
        parsed.applicationEmail === null
          ? null
          : await resolveApplicationAccount(
              transaction,
              parsed.applicationEmail,
              parsedTutorId,
            );
      const nextUserId = nextApplicationAccount?.id ?? null;

      if (nextUserId !== existing.applicationUserId) {
        values.applicationUserId = nextUserId;
        applicationAccountChange = {
          previousUserId: existing.applicationUserId,
          nextUserId,
        };
        changedFields.push("applicationAccount");
      }
    }

    if (parsed.firstName !== undefined) {
      values.firstName = cleanDisplayText(parsed.firstName);
      changedFields.push("firstName");
    }

    if (parsed.lastName !== undefined) {
      values.lastName = cleanDisplayText(parsed.lastName);
      changedFields.push("lastName");
    }

    if ("preferredDisplayName" in parsed) {
      values.preferredDisplayName =
        parsed.preferredDisplayName === null ||
        parsed.preferredDisplayName === undefined
          ? null
          : cleanDisplayText(parsed.preferredDisplayName);
      changedFields.push("preferredDisplayName");
    }

    if ("institutionalIdentifier" in parsed) {
      values.institutionalIdentifier = parsed.institutionalIdentifier ?? null;
      values.normalizedInstitutionalIdentifier = normalizedNullableIdentifier(
        parsed.institutionalIdentifier,
      );
      changedFields.push("institutionalIdentifier");
    }

    if (parsed.primaryCareerId !== undefined) {
      values.primaryCareerId = parsed.primaryCareerId;
      changedFields.push("primaryCareerId");
    }

    await transaction
      .update(tutor)
      .set(values)
      .where(eq(tutor.id, parsedTutorId));

    let subjectChanges = { addedSubjectIds: [] as string[], removedSubjectIds: [] as string[] };
    if (parsed.subjectIds !== undefined) {
      subjectChanges = await syncTutorSubjects(
        transaction,
        parsedTutorId,
        parsed.subjectIds,
      );
      if (
        subjectChanges.addedSubjectIds.length > 0 ||
        subjectChanges.removedSubjectIds.length > 0
      ) {
        changedFields.push("subjectIds");
      }
    }

    let membershipChanged = false;
    let currentMembership = undefined;
    if (parsed.cycleId !== undefined) {
      await requireOpenCycle(transaction, parsed.cycleId);
      currentMembership = await findCurrentMembership(
        transaction,
        parsedTutorId,
      );
      const scholarshipReferenceId =
        parsed.scholarshipReferenceId !== undefined
          ? parsed.scholarshipReferenceId
          : currentMembership?.scholarshipReferenceId ?? null;

      if (parsed.scholarshipReferenceId !== undefined) {
        await requireActiveScholarshipReference(
          transaction,
          parsed.scholarshipReferenceId,
        );
      }

      if (currentMembership === undefined) {
        await transaction.insert(tutorCycleMembership).values({
          tutorId: parsedTutorId,
          cycleId: parsed.cycleId,
          scholarshipReferenceId,
        });
      } else {
        await transaction
          .update(tutorCycleMembership)
          .set({
            scholarshipReferenceId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tutorCycleMembership.tutorId, parsedTutorId),
              eq(tutorCycleMembership.cycleId, parsed.cycleId),
            ),
          );
      }

      membershipChanged = true;
      changedFields.push("cycleMembership");
    }

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "tutor.updated",
      entityType: "tutor",
      entityId: parsedTutorId,
      metadata: {
        changedFields,
        addedSubjectIds: subjectChanges.addedSubjectIds,
        removedSubjectIds: subjectChanges.removedSubjectIds,
        ...(membershipChanged
          ? {
              cycleId: parsed.cycleId ?? currentMembership?.cycleId ?? null,
              scholarshipReferenceId:
                parsed.scholarshipReferenceId !== undefined
                  ? parsed.scholarshipReferenceId
                  : currentMembership?.scholarshipReferenceId ?? null,
            }
          : {}),
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    if (applicationAccountChange !== null) {
      await recordApplicationAccountChange(
        transaction,
        parsedTutorId,
        applicationAccountChange,
        context,
      );
    }

    return getTutorDetail(transaction, parsedTutorId);
  });
}

export async function transitionTutorStatus(
  db: Database,
  tutorId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeTutorDetail> {
  const parsedTutorId = parseTutorId(tutorId);
  const parsed = parseStatusTransitionServiceInput(input);

  return runMutation(db, async (transaction) => {
    const [existing] = await transaction
      .select({ id: tutor.id, status: tutor.status })
      .from(tutor)
      .where(eq(tutor.id, parsedTutorId))
      .limit(1);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.tutorNotFound,
        "The Tutor was not found.",
        { details: { tutorId: parsedTutorId } },
      );
    }

    if (existing.status === parsed.status) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.statusAlreadySet,
        "The Tutor already has the requested status.",
        { details: { tutorId: parsedTutorId, status: parsed.status } },
      );
    }

    await transaction
      .update(tutor)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(tutor.id, parsedTutorId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "tutor.status_changed",
      entityType: "tutor",
      entityId: parsedTutorId,
      metadata: {
        previousStatus: existing.status,
        status: parsed.status,
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getTutorDetail(transaction, parsedTutorId);
  });
}

export const setTutorStatus = transitionTutorStatus;

async function getCareerRecord(db: SelectDatabase, careerId: string) {
  const [row] = await db
    .select({ id: career.id, name: career.name, status: career.status })
    .from(career)
    .where(eq(career.id, careerId))
    .limit(1);

  return row;
}

export async function getCareer(
  db: SelectDatabase,
  careerId: string,
): Promise<SafeCareer> {
  const parsedCareerId = parseTutorId(careerId);

  return runQuery(async () => {
    const row = await getCareerRecord(db, parsedCareerId);

    if (row === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.careerNotFound,
        "The Career was not found.",
      );
    }

    return toSafeCareer(row);
  });
}

export async function createCareer(
  db: Database,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeCareer> {
  const parsed = parseServiceInput(parseCreateCareerInput, input);

  return runMutation(db, async (transaction) => {
    const displayName = cleanDisplayText(parsed.name);
    const [created] = await transaction
      .insert(career)
      .values({
        name: displayName,
        normalizedName: normalizeName(displayName),
        status: "ACTIVE",
      })
      .returning({ id: career.id });

    if (created === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.transactionFailed,
        "The Career could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "career.created",
      entityType: "career",
      entityId: created.id,
      metadata: { status: "ACTIVE" },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getCareer(transaction, created.id);
  });
}

export async function updateCareer(
  db: Database,
  careerId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeCareer> {
  const parsedCareerId = parseTutorId(careerId);
  const parsed = parseServiceInput(parseUpdateCareerInput, input);

  return runMutation(db, async (transaction) => {
    const existing = await getCareerRecord(transaction, parsedCareerId);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.careerNotFound,
        "The Career was not found.",
        { details: { careerId: parsedCareerId } },
      );
    }

    const displayName = cleanDisplayText(parsed.name ?? existing.name);
    await transaction
      .update(career)
      .set({
        name: displayName,
        normalizedName: normalizeName(displayName),
        updatedAt: new Date(),
      })
      .where(eq(career.id, parsedCareerId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "career.updated",
      entityType: "career",
      entityId: parsedCareerId,
      metadata: { changedFields: ["name"] },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getCareer(transaction, parsedCareerId);
  });
}

export async function transitionCareerStatus(
  db: Database,
  careerId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeCareer> {
  const parsedCareerId = parseTutorId(careerId);
  const parsed = parseStatusTransitionServiceInput(input);

  return runMutation(db, async (transaction) => {
    const existing = await getCareerRecord(transaction, parsedCareerId);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.careerNotFound,
        "The Career was not found.",
      );
    }

    if (existing.status === parsed.status) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.statusAlreadySet,
        "The Career already has the requested status.",
      );
    }

    await transaction
      .update(career)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(career.id, parsedCareerId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "career.status_changed",
      entityType: "career",
      entityId: parsedCareerId,
      metadata: { previousStatus: existing.status, status: parsed.status },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getCareer(transaction, parsedCareerId);
  });
}

export const setCareerStatus = transitionCareerStatus;

async function getSubjectRecord(db: SelectDatabase, subjectId: string) {
  const [row] = await db
    .select({
      id: subject.id,
      name: subject.name,
      careerId: career.id,
      careerName: career.name,
      status: subject.status,
    })
    .from(subject)
    .innerJoin(career, eq(subject.careerId, career.id))
    .where(eq(subject.id, subjectId))
    .limit(1);

  return row;
}

export async function getSubject(
  db: SelectDatabase,
  subjectId: string,
): Promise<SafeSubject> {
  const parsedSubjectId = parseTutorId(subjectId);

  return runQuery(async () => {
    const row = await getSubjectRecord(db, parsedSubjectId);

    if (row === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.subjectNotFound,
        "The Subject was not found.",
      );
    }

    return toSafeSubject(row);
  });
}

export async function createSubject(
  db: Database,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeSubject> {
  const parsed = parseServiceInput(parseCreateSubjectInput, input);

  return runMutation(db, async (transaction) => {
    await requireActiveCareer(transaction, parsed.careerId);
    const displayName = cleanDisplayText(parsed.name);
    const [created] = await transaction
      .insert(subject)
      .values({
        careerId: parsed.careerId,
        name: displayName,
        normalizedName: normalizeName(displayName),
        status: "ACTIVE",
      })
      .returning({ id: subject.id });

    if (created === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.transactionFailed,
        "The Subject could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "subject.created",
      entityType: "subject",
      entityId: created.id,
      metadata: { careerId: parsed.careerId, status: "ACTIVE" },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getSubject(transaction, created.id);
  });
}

export async function updateSubject(
  db: Database,
  subjectId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeSubject> {
  const parsedSubjectId = parseTutorId(subjectId);
  const parsed = parseServiceInput(parseUpdateSubjectInput, input);

  return runMutation(db, async (transaction) => {
    const existing = await getSubjectRecord(transaction, parsedSubjectId);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.subjectNotFound,
        "The Subject was not found.",
      );
    }

    const targetCareerId = parsed.careerId ?? existing.careerId;
    await requireActiveCareer(transaction, targetCareerId);

    if (parsed.careerId !== undefined && parsed.careerId !== existing.careerId) {
      const [assignment] = await transaction
        .select({ tutorId: tutorSubject.tutorId })
        .from(tutorSubject)
        .where(eq(tutorSubject.subjectId, parsedSubjectId))
        .limit(1);

      if (assignment !== undefined) {
        throw new TutorServiceError(
          TUTOR_ERROR_CODES.catalogConflict,
          "An assigned Subject cannot change Career.",
          { details: { subjectId: parsedSubjectId } },
        );
      }
    }

    const displayName =
      parsed.name === undefined ? existing.name : cleanDisplayText(parsed.name);
    await transaction
      .update(subject)
      .set({
        careerId: targetCareerId,
        name: displayName,
        normalizedName: normalizeName(displayName),
        updatedAt: new Date(),
      })
      .where(eq(subject.id, parsedSubjectId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "subject.updated",
      entityType: "subject",
      entityId: parsedSubjectId,
      metadata: {
        careerId: targetCareerId,
        changedFields: [
          ...(parsed.name === undefined ? [] : ["name"]),
          ...(parsed.careerId === undefined ? [] : ["careerId"]),
        ],
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getSubject(transaction, parsedSubjectId);
  });
}

export async function transitionSubjectStatus(
  db: Database,
  subjectId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeSubject> {
  const parsedSubjectId = parseTutorId(subjectId);
  const parsed = parseStatusTransitionServiceInput(input);

  return runMutation(db, async (transaction) => {
    const existing = await getSubjectRecord(transaction, parsedSubjectId);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.subjectNotFound,
        "The Subject was not found.",
      );
    }

    if (existing.status === parsed.status) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.statusAlreadySet,
        "The Subject already has the requested status.",
      );
    }

    await transaction
      .update(subject)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(subject.id, parsedSubjectId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "subject.status_changed",
      entityType: "subject",
      entityId: parsedSubjectId,
      metadata: { previousStatus: existing.status, status: parsed.status },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getSubject(transaction, parsedSubjectId);
  });
}

export const setSubjectStatus = transitionSubjectStatus;

async function getScholarshipReferenceRecord(
  db: SelectDatabase,
  scholarshipReferenceId: string,
) {
  const [row] = await db
    .select({
      id: scholarshipReference.id,
      type: scholarshipReference.type,
      knownRequiredHours: scholarshipReference.knownRequiredHours,
      notes: scholarshipReference.notes,
      status: scholarshipReference.status,
    })
    .from(scholarshipReference)
    .where(eq(scholarshipReference.id, scholarshipReferenceId))
    .limit(1);

  return row;
}

export async function getScholarshipReference(
  db: SelectDatabase,
  scholarshipReferenceId: string,
): Promise<SafeScholarshipReference> {
  const parsedId = parseTutorId(scholarshipReferenceId);

  return runQuery(async () => {
    const row = await getScholarshipReferenceRecord(db, parsedId);

    if (row === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.scholarshipReferenceNotFound,
        "The scholarship reference was not found.",
      );
    }

    return toSafeScholarshipReference(row);
  });
}

export async function createScholarshipReference(
  db: Database,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeScholarshipReference> {
  const parsed = parseServiceInput(
    parseCreateScholarshipReferenceInput,
    input,
  );

  return runMutation(db, async (transaction) => {
    const displayType = cleanDisplayText(parsed.type);
    const [created] = await transaction
      .insert(scholarshipReference)
      .values({
        type: displayType,
        normalizedType: normalizeName(displayType),
        knownRequiredHours: parsed.knownRequiredHours,
        notes: parsed.notes,
        status: "ACTIVE",
      })
      .returning({ id: scholarshipReference.id });

    if (created === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.transactionFailed,
        "The scholarship reference could not be created.",
      );
    }

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "scholarship_reference.created",
      entityType: "scholarship_reference",
      entityId: created.id,
      metadata: { status: "ACTIVE" },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getScholarshipReference(transaction, created.id);
  });
}

export async function updateScholarshipReference(
  db: Database,
  scholarshipReferenceId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeScholarshipReference> {
  const parsedId = parseTutorId(scholarshipReferenceId);
  const parsed = parseServiceInput(
    parseUpdateScholarshipReferenceInput,
    input,
  );

  return runMutation(db, async (transaction) => {
    const existing = await getScholarshipReferenceRecord(transaction, parsedId);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.scholarshipReferenceNotFound,
        "The scholarship reference was not found.",
      );
    }

    const displayType = parsed.type === undefined ? existing.type : cleanDisplayText(parsed.type);
    await transaction
      .update(scholarshipReference)
      .set({
        type: displayType,
        normalizedType: normalizeName(displayType),
        knownRequiredHours:
          parsed.knownRequiredHours === undefined
            ? existing.knownRequiredHours
            : parsed.knownRequiredHours,
        notes: parsed.notes === undefined ? existing.notes : parsed.notes,
        updatedAt: new Date(),
      })
      .where(eq(scholarshipReference.id, parsedId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "scholarship_reference.updated",
      entityType: "scholarship_reference",
      entityId: parsedId,
      metadata: {
        changedFields: [
          ...(parsed.type === undefined ? [] : ["type"]),
          ...(parsed.knownRequiredHours === undefined
            ? []
            : ["knownRequiredHours"]),
          ...(parsed.notes === undefined ? [] : ["notes"]),
        ],
      },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getScholarshipReference(transaction, parsedId);
  });
}

export async function transitionScholarshipReferenceStatus(
  db: Database,
  scholarshipReferenceId: string,
  input: unknown,
  context: TutorMutationContext = {},
): Promise<SafeScholarshipReference> {
  const parsedId = parseTutorId(scholarshipReferenceId);
  const parsed = parseStatusTransitionServiceInput(input);

  return runMutation(db, async (transaction) => {
    const existing = await getScholarshipReferenceRecord(transaction, parsedId);

    if (existing === undefined) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.scholarshipReferenceNotFound,
        "The scholarship reference was not found.",
      );
    }

    if (existing.status === parsed.status) {
      throw new TutorServiceError(
        TUTOR_ERROR_CODES.statusAlreadySet,
        "The scholarship reference already has the requested status.",
      );
    }

    await transaction
      .update(scholarshipReference)
      .set({ status: parsed.status, updatedAt: new Date() })
      .where(eq(scholarshipReference.id, parsedId));

    await recordAuditEvent(transaction, {
      actorId: context.actorId ?? null,
      action: "scholarship_reference.status_changed",
      entityType: "scholarship_reference",
      entityId: parsedId,
      metadata: { previousStatus: existing.status, status: parsed.status },
      requestId: context.requestId ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return getScholarshipReference(transaction, parsedId);
  });
}

export const setScholarshipReferenceStatus = transitionScholarshipReferenceStatus;

export type {
  ParsedCreateCareerInput,
  ParsedCreateScholarshipReferenceInput,
  ParsedCreateSubjectInput,
  ParsedCreateTutorInput,
  ParsedStatusTransitionInput,
  ParsedTutorSearchFilters,
  ParsedUpdateCareerInput,
  ParsedUpdateScholarshipReferenceInput,
  ParsedUpdateSubjectInput,
  ParsedUpdateTutorInput,
};
