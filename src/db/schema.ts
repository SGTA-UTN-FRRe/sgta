import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { SafeAuditMetadata } from "./audit-validation";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "TUTOR"]);

export const administrativeCycleStatusEnum = pgEnum(
  "administrative_cycle_status",
  ["OPEN", "CLOSED"],
);

export const recordStatusEnum = pgEnum("record_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const hourMovementDirectionEnum = pgEnum("hour_movement_direction", [
  "CREDIT",
  "DEBIT",
]);

export const activityKindEnum = pgEnum("activity_kind", [
  "MEETING",
  "WORKSHOP",
  "EXTRAORDINARY",
  "RECOVERY",
]);

export const schedulePlanKindEnum = pgEnum("schedule_plan_kind", [
  "REGULAR",
  "SPECIAL",
]);

export const scheduleAssignmentPatternEnum = pgEnum(
  "schedule_assignment_pattern",
  ["WEEKDAY", "DATE"],
);

export const scheduleAssignmentKindEnum = pgEnum("schedule_assignment_kind", [
  "DUTY",
  "RECOVERY",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PENDING",
  "PRESENT",
  "ABSENT",
]);

export const attendanceDebitStatusEnum = pgEnum("attendance_debit_status", [
  "NOT_PROPOSED",
  "PROPOSED",
  "CANCELLED",
  "CONFIRMED",
]);

export const consultationSourceProviderEnum = pgEnum(
  "consultation_source_provider",
  ["GOOGLE_SHEETS"],
);

export const consultationClassificationEnum = pgEnum(
  "consultation_classification",
  ["SUBJECT", "GENERAL", "PENDING_CLASSIFICATION"],
);

export const consultationStagingStatusEnum = pgEnum(
  "consultation_staging_status",
  ["PENDING_REVIEW", "READY", "CONSOLIDATED", "DUPLICATE"],
);

export const consultationImportRunStatusEnum = pgEnum(
  "consultation_import_run_status",
  ["RUNNING", "SUCCEEDED", "PARTIAL", "FAILED"],
);

export const consultationDuplicateDecisionEnum = pgEnum(
  "consultation_duplicate_decision",
  ["PENDING", "DUPLICATE", "NOT_DUPLICATE"],
);

export const consultationAnomalyCodeEnum = pgEnum(
  "consultation_anomaly_code",
  [
    "MISSING_SOURCE_ROW_KEY",
    "MISSING_CAREER",
    "UNRESOLVED_CAREER",
    "AMBIGUOUS_CAREER",
    "MISSING_STUDENT_FIRST_NAME",
    "MISSING_STUDENT_LAST_NAME",
    "INVALID_CONSULTATION_DATE",
    "MISSING_TUTOR",
    "UNRESOLVED_TUTOR",
    "AMBIGUOUS_TUTOR",
    "MISSING_ACADEMIC_STAGE",
    "MISSING_MODALITY",
    "MISSING_TOPIC",
    "POSSIBLE_DUPLICATE",
    "SOURCE_ROW_CHANGED",
  ],
);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("TUTOR"),
    enabled: boolean("enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "user_email_normalized_check",
      sql`${table.email} = lower(${table.email})`,
    ),
    check("user_email_not_blank_check", sql`length(trim(${table.email})) > 0`),
    index("user_enabled_role_idx").on(table.enabled, table.role),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const administrativeCycle = pgTable(
  "administrative_cycle",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    status: administrativeCycleStatusEnum("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "administrative_cycle_date_range_check",
      sql`${table.startDate} <= ${table.endDate}`,
    ),
    index("administrative_cycle_status_idx").on(table.status),
    index("administrative_cycle_dates_idx").on(
      table.startDate,
      table.endDate,
    ),
    uniqueIndex("administrative_cycle_one_open_idx")
      .on(table.status)
      .where(sql`${table.status} = 'OPEN'`),
  ],
);

export const career = pgTable(
  "career",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("career_name_not_blank_check", sql`length(trim(${table.name})) > 0`),
    check(
      "career_normalized_name_not_blank_check",
      sql`length(trim(${table.normalizedName})) > 0`,
    ),
    check(
      "career_normalized_name_check",
      sql`${table.normalizedName} = lower(trim(${table.name}))`,
    ),
    uniqueIndex("career_normalized_name_unique").on(table.normalizedName),
    index("career_status_idx").on(table.status),
  ],
);

export const subject = pgTable(
  "subject",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    careerId: uuid("career_id")
      .notNull()
      .references(() => career.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("subject_name_not_blank_check", sql`length(trim(${table.name})) > 0`),
    check(
      "subject_normalized_name_not_blank_check",
      sql`length(trim(${table.normalizedName})) > 0`,
    ),
    check(
      "subject_normalized_name_check",
      sql`${table.normalizedName} = lower(trim(${table.name}))`,
    ),
    uniqueIndex("subject_career_normalized_name_unique").on(
      table.careerId,
      table.normalizedName,
    ),
    index("subject_career_status_idx").on(table.careerId, table.status),
  ],
);

export const scholarshipReference = pgTable(
  "scholarship_reference",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    normalizedType: text("normalized_type").notNull(),
    knownRequiredHours: integer("known_required_hours"),
    notes: text("notes"),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "scholarship_reference_type_not_blank_check",
      sql`length(trim(${table.type})) > 0`,
    ),
    check(
      "scholarship_reference_normalized_type_not_blank_check",
      sql`length(trim(${table.normalizedType})) > 0`,
    ),
    check(
      "scholarship_reference_normalized_type_check",
      sql`${table.normalizedType} = lower(trim(${table.type}))`,
    ),
    check(
      "scholarship_reference_hours_non_negative_check",
      sql`${table.knownRequiredHours} IS NULL OR ${table.knownRequiredHours} >= 0`,
    ),
    uniqueIndex("scholarship_reference_normalized_type_unique").on(
      table.normalizedType,
    ),
    index("scholarship_reference_status_idx").on(table.status),
  ],
);

export const tutor = pgTable(
  "tutor",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationUserId: text("application_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredDisplayName: text("preferred_display_name"),
    institutionalIdentifier: text("institutional_identifier"),
    normalizedInstitutionalIdentifier: text("normalized_institutional_identifier"),
    primaryCareerId: uuid("primary_career_id")
      .notNull()
      .references(() => career.id, { onDelete: "restrict" }),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("tutor_first_name_not_blank_check", sql`length(trim(${table.firstName})) > 0`),
    check("tutor_last_name_not_blank_check", sql`length(trim(${table.lastName})) > 0`),
    check(
      "tutor_preferred_display_name_check",
      sql`${table.preferredDisplayName} IS NULL OR length(trim(${table.preferredDisplayName})) > 0`,
    ),
    check(
      "tutor_institutional_identifier_check",
      sql`${table.institutionalIdentifier} IS NULL OR length(trim(${table.institutionalIdentifier})) > 0`,
    ),
    check(
      "tutor_institutional_identifier_normalized_check",
      sql`(
        (${table.institutionalIdentifier} IS NULL AND ${table.normalizedInstitutionalIdentifier} IS NULL)
        OR
        (
          ${table.institutionalIdentifier} IS NOT NULL
          AND ${table.normalizedInstitutionalIdentifier} IS NOT NULL
          AND length(trim(${table.normalizedInstitutionalIdentifier})) > 0
          AND ${table.normalizedInstitutionalIdentifier} = lower(trim(${table.institutionalIdentifier}))
        )
      )`,
    ),
    uniqueIndex("tutor_institutional_identifier_unique")
      .on(table.normalizedInstitutionalIdentifier)
      .where(sql`${table.normalizedInstitutionalIdentifier} IS NOT NULL`),
    uniqueIndex("tutor_application_user_unique")
      .on(table.applicationUserId)
      .where(sql`${table.applicationUserId} IS NOT NULL`),
    index("tutor_primary_career_idx").on(table.primaryCareerId),
    index("tutor_status_idx").on(table.status),
  ],
);

export const tutorSubject = pgTable(
  "tutor_subject",
  {
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutor.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subject.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.tutorId, table.subjectId],
      name: "tutor_subject_pk",
    }),
    index("tutor_subject_subject_idx").on(table.subjectId),
  ],
);

export const tutorCycleMembership = pgTable(
  "tutor_cycle_membership",
  {
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutor.id, { onDelete: "restrict" }),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => administrativeCycle.id, { onDelete: "restrict" }),
    scholarshipReferenceId: uuid("scholarship_reference_id").references(
      () => scholarshipReference.id,
      { onDelete: "restrict" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.tutorId, table.cycleId],
      name: "tutor_cycle_membership_pk",
    }),
    index("tutor_cycle_membership_cycle_idx").on(table.cycleId),
    index("tutor_cycle_membership_scholarship_reference_idx").on(
      table.scholarshipReferenceId,
    ),
  ],
);

export const schedulePlan = pgTable(
  "schedule_plan",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => administrativeCycle.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    kind: schedulePlanKindEnum("kind").notNull(),
    validFrom: date("valid_from", { mode: "string" }).notNull(),
    validTo: date("valid_to", { mode: "string" }).notNull(),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "schedule_plan_name_not_blank_check",
      sql`length(trim(${table.name})) > 0`,
    ),
    check(
      "schedule_plan_validity_check",
      sql`${table.validFrom} <= ${table.validTo}`,
    ),
    uniqueIndex("schedule_plan_active_regular_unique")
      .on(table.cycleId)
      .where(
        sql`${table.kind} = 'REGULAR' AND ${table.status} = 'ACTIVE'`,
      ),
    index("schedule_plan_cycle_status_idx").on(table.cycleId, table.status),
    index("schedule_plan_cycle_validity_idx").on(
      table.cycleId,
      table.validFrom,
      table.validTo,
    ),
  ],
);

export const scheduleAssignment = pgTable(
  "schedule_assignment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => schedulePlan.id, { onDelete: "restrict" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutor.id, { onDelete: "restrict" }),
    pattern: scheduleAssignmentPatternEnum("pattern").notNull(),
    weekday: integer("weekday"),
    assignmentDate: date("assignment_date", { mode: "string" }),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
    kind: scheduleAssignmentKindEnum("kind").notNull().default("DUTY"),
    modality: text("modality"),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "schedule_assignment_pattern_check",
      sql`(
        (${table.pattern} = 'WEEKDAY' AND ${table.weekday} IS NOT NULL AND ${table.assignmentDate} IS NULL)
        OR
        (${table.pattern} = 'DATE' AND ${table.weekday} IS NULL AND ${table.assignmentDate} IS NOT NULL)
      )`,
    ),
    check(
      "schedule_assignment_weekday_check",
      sql`${table.weekday} IS NULL OR (${table.weekday} >= 1 AND ${table.weekday} <= 7)`,
    ),
    check(
      "schedule_assignment_time_range_check",
      sql`${table.startMinutes} >= 0 AND ${table.startMinutes} < 1440 AND ${table.endMinutes} > 0 AND ${table.endMinutes} <= 1440 AND ${table.startMinutes} < ${table.endMinutes}`,
    ),
    check(
      "schedule_assignment_modality_not_blank_check",
      sql`${table.modality} IS NULL OR length(trim(${table.modality})) > 0`,
    ),
    index("schedule_assignment_plan_status_idx").on(
      table.planId,
      table.status,
    ),
    index("schedule_assignment_tutor_status_idx").on(
      table.tutorId,
      table.status,
    ),
    index("schedule_assignment_date_idx").on(table.assignmentDate),
  ],
);

export const dutyOccurrence = pgTable(
  "duty_occurrence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => administrativeCycle.id, { onDelete: "restrict" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => schedulePlan.id, { onDelete: "restrict" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => scheduleAssignment.id, { onDelete: "restrict" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutor.id, { onDelete: "restrict" }),
    occurrenceDate: date("occurrence_date", { mode: "string" }).notNull(),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
    kind: scheduleAssignmentKindEnum("kind").notNull(),
    modality: text("modality"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "duty_occurrence_time_range_check",
      sql`${table.startMinutes} >= 0 AND ${table.startMinutes} < 1440 AND ${table.endMinutes} > 0 AND ${table.endMinutes} <= 1440 AND ${table.startMinutes} < ${table.endMinutes}`,
    ),
    check(
      "duty_occurrence_modality_not_blank_check",
      sql`${table.modality} IS NULL OR length(trim(${table.modality})) > 0`,
    ),
    uniqueIndex("duty_occurrence_assignment_date_unique").on(
      table.assignmentId,
      table.occurrenceDate,
    ),
    index("duty_occurrence_cycle_date_idx").on(
      table.cycleId,
      table.occurrenceDate,
    ),
    index("duty_occurrence_tutor_date_idx").on(
      table.tutorId,
      table.occurrenceDate,
    ),
  ],
);

export const attendanceRecord = pgTable(
  "attendance_record",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    occurrenceId: uuid("occurrence_id")
      .notNull()
      .references(() => dutyOccurrence.id, { onDelete: "restrict" }),
    status: attendanceStatusEnum("status").notNull().default("PENDING"),
    debitStatus: attendanceDebitStatusEnum("debit_status")
      .notNull()
      .default("NOT_PROPOSED"),
    proposedDebitMinutes: integer("proposed_debit_minutes"),
    recognizedDebitMinutes: integer("recognized_debit_minutes"),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "attendance_record_proposed_debit_minutes_check",
      sql`${table.proposedDebitMinutes} IS NULL OR ${table.proposedDebitMinutes} >= 0`,
    ),
    check(
      "attendance_record_recognized_debit_minutes_check",
      sql`${table.recognizedDebitMinutes} IS NULL OR ${table.recognizedDebitMinutes} >= 0`,
    ),
    uniqueIndex("attendance_record_occurrence_unique").on(table.occurrenceId),
    index("attendance_record_status_idx").on(table.status, table.debitStatus),
  ],
);

export const hourCategory = pgTable(
  "hour_category",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    activityKind: activityKindEnum("activity_kind"),
    status: recordStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "hour_category_name_not_blank_check",
      sql`length(trim(${table.name})) > 0`,
    ),
    check(
      "hour_category_normalized_name_not_blank_check",
      sql`length(trim(${table.normalizedName})) > 0`,
    ),
    check(
      "hour_category_normalized_name_check",
      sql`${table.normalizedName} = lower(trim(${table.name}))`,
    ),
    uniqueIndex("hour_category_normalized_name_unique").on(
      table.normalizedName,
    ),
    index("hour_category_status_idx").on(table.status),
  ],
);

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => administrativeCycle.id, { onDelete: "restrict" }),
    kind: activityKindEnum("kind").notNull(),
    activityDate: date("activity_date", { mode: "string" }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    note: text("note"),
    dutyOccurrenceId: uuid("duty_occurrence_id").references(
      () => dutyOccurrence.id,
      { onDelete: "restrict" },
    ),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "activity_duration_minutes_positive_check",
      sql`${table.durationMinutes} > 0`,
    ),
    check(
      "activity_note_not_blank_check",
      sql`${table.note} IS NULL OR length(trim(${table.note})) > 0`,
    ),
    index("activity_cycle_date_idx").on(table.cycleId, table.activityDate),
    index("activity_kind_idx").on(table.kind),
    index("activity_duty_occurrence_idx").on(table.dutyOccurrenceId),
  ],
);

export const hourMovement = pgTable(
  "hour_movement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cycleId: uuid("cycle_id")
      .notNull()
      .references(() => administrativeCycle.id, { onDelete: "restrict" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutor.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => hourCategory.id, { onDelete: "restrict" }),
    direction: hourMovementDirectionEnum("direction").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    movementDate: date("movement_date", { mode: "string" }).notNull(),
    note: text("note"),
    activityId: uuid("activity_id").references(() => activity.id, {
      onDelete: "restrict",
    }),
    attendanceRecordId: uuid("attendance_record_id").references(
      () => attendanceRecord.id,
      { onDelete: "restrict" },
    ),
    reversalOfMovementId: uuid("reversal_of_movement_id").references(
      (): AnyPgColumn => hourMovement.id,
      { onDelete: "restrict" },
    ),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "hour_movement_duration_minutes_positive_check",
      sql`${table.durationMinutes} > 0`,
    ),
    check(
      "hour_movement_note_not_blank_check",
      sql`${table.note} IS NULL OR length(trim(${table.note})) > 0`,
    ),
    check(
      "hour_movement_not_self_reversal_check",
      sql`${table.reversalOfMovementId} IS NULL OR ${table.reversalOfMovementId} <> ${table.id}`,
    ),
    index("hour_movement_cycle_tutor_date_idx").on(
      table.cycleId,
      table.tutorId,
      table.movementDate,
    ),
    index("hour_movement_movement_date_idx").on(table.movementDate),
    index("hour_movement_category_idx").on(table.categoryId),
    index("hour_movement_activity_idx").on(table.activityId),
    index("hour_movement_attendance_idx").on(table.attendanceRecordId),
    uniqueIndex("hour_movement_reversal_unique")
      .on(table.reversalOfMovementId)
      .where(sql`${table.reversalOfMovementId} IS NOT NULL`),
  ],
);

export const consultationImportRun = pgTable(
  "consultation_import_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: consultationImportRunStatusEnum("status")
      .notNull()
      .default("RUNNING"),
    sourceSpreadsheetId: text("source_spreadsheet_id"),
    sourceRange: text("source_range"),
    newRows: integer("new_rows").notNull().default(0),
    alreadyProcessedRows: integer("already_processed_rows")
      .notNull()
      .default(0),
    reviewRows: integer("review_rows").notNull().default(0),
    duplicateCandidates: integer("duplicate_candidates").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    errorCode: text("error_code"),
    requestId: text("request_id"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "consultation_import_run_counts_non_negative_check",
      sql`${table.newRows} >= 0 AND ${table.alreadyProcessedRows} >= 0 AND ${table.reviewRows} >= 0 AND ${table.duplicateCandidates} >= 0 AND ${table.errorRows} >= 0`,
    ),
    check(
      "consultation_import_run_completion_check",
      sql`(${table.status} = 'RUNNING' AND ${table.completedAt} IS NULL) OR (${table.status} <> 'RUNNING' AND ${table.completedAt} IS NOT NULL)`,
    ),
    check(
      "consultation_import_run_source_bounds_check",
      sql`(${table.sourceSpreadsheetId} IS NULL OR length(trim(${table.sourceSpreadsheetId})) BETWEEN 1 AND 256) AND (${table.sourceRange} IS NULL OR length(trim(${table.sourceRange})) BETWEEN 1 AND 256)`,
    ),
    check(
      "consultation_import_run_error_code_check",
      sql`${table.errorCode} IS NULL OR ${table.errorCode} ~ '^[a-z0-9_]{1,80}$'`,
    ),
    check(
      "consultation_import_run_request_id_check",
      sql`${table.requestId} IS NULL OR length(trim(${table.requestId})) BETWEEN 1 AND 255`,
    ),
    uniqueIndex("consultation_import_run_active_source_unique")
      .on(table.sourceSpreadsheetId, table.sourceRange)
      .where(
        sql`${table.status} = 'RUNNING' AND ${table.sourceSpreadsheetId} IS NOT NULL`,
      ),
    index("consultation_import_run_status_started_idx").on(
      table.status,
      table.startedAt,
    ),
    index("consultation_import_run_actor_started_idx").on(
      table.actorId,
      table.startedAt,
    ),
  ],
);

export const consultationStaging = pgTable(
  "consultation_staging",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceProvider: consultationSourceProviderEnum("source_provider")
      .notNull()
      .default("GOOGLE_SHEETS"),
    sourceSpreadsheetId: text("source_spreadsheet_id").notNull(),
    sourceTab: text("source_tab").notNull(),
    sourceRowKey: text("source_row_key").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    previousSourceFingerprint: text("previous_source_fingerprint"),
    firstSeenRunId: uuid("first_seen_run_id")
      .notNull()
      .references(() => consultationImportRun.id, { onDelete: "restrict" }),
    lastSeenRunId: uuid("last_seen_run_id")
      .notNull()
      .references(() => consultationImportRun.id, { onDelete: "restrict" }),
    rawCareer: text("raw_career"),
    rawStudentFirstName: text("raw_student_first_name"),
    rawStudentLastName: text("raw_student_last_name"),
    rawConsultationDate: text("raw_consultation_date"),
    rawTutor: text("raw_tutor"),
    rawAcademicStage: text("raw_academic_stage"),
    rawModality: text("raw_modality"),
    rawTopic: text("raw_topic"),
    rawContact: text("raw_contact"),
    normalizedCareer: text("normalized_career"),
    careerId: uuid("career_id").references(() => career.id, {
      onDelete: "restrict",
    }),
    normalizedStudentFirstName: text("normalized_student_first_name"),
    normalizedStudentLastName: text("normalized_student_last_name"),
    normalizedConsultationDate: date("normalized_consultation_date", {
      mode: "string",
    }),
    normalizedTutor: text("normalized_tutor"),
    tutorId: uuid("tutor_id").references(() => tutor.id, {
      onDelete: "restrict",
    }),
    normalizedAcademicStage: text("normalized_academic_stage"),
    normalizedModality: text("normalized_modality"),
    normalizedTopic: text("normalized_topic"),
    normalizedContact: text("normalized_contact"),
    anomalyFlags: consultationAnomalyCodeEnum("anomaly_flags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::consultation_anomaly_code[]`),
    acknowledgedAnomalies: consultationAnomalyCodeEnum("acknowledged_anomalies")
      .array()
      .notNull()
      .default(sql`ARRAY[]::consultation_anomaly_code[]`),
    status: consultationStagingStatusEnum("status")
      .notNull()
      .default("PENDING_REVIEW"),
    classification: consultationClassificationEnum("classification")
      .notNull()
      .default("PENDING_CLASSIFICATION"),
    subjectId: uuid("subject_id").references(() => subject.id, {
      onDelete: "restrict",
    }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewVersion: integer("review_version").notNull().default(1),
    sourceChangedAt: timestamp("source_changed_at", { withTimezone: true }),
    sourceChangeCount: integer("source_change_count").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "consultation_staging_source_identity_bounds_check",
      sql`length(trim(${table.sourceSpreadsheetId})) BETWEEN 1 AND 256 AND length(trim(${table.sourceTab})) BETWEEN 1 AND 200 AND length(trim(${table.sourceRowKey})) BETWEEN 1 AND 255`,
    ),
    check(
      "consultation_staging_source_fingerprint_check",
      sql`${table.sourceFingerprint} ~ '^[0-9a-f]{64}$' AND (${table.previousSourceFingerprint} IS NULL OR ${table.previousSourceFingerprint} ~ '^[0-9a-f]{64}$')`,
    ),
    check(
      "consultation_staging_anomaly_flags_bounds_check",
      sql`cardinality(${table.anomalyFlags}) <= 32`,
    ),
    check(
      "consultation_staging_acknowledged_anomalies_bounds_check",
      sql`cardinality(${table.acknowledgedAnomalies}) <= 32`,
    ),
    check(
      "consultation_staging_raw_field_bounds_check",
      sql`(${table.rawCareer} IS NULL OR length(${table.rawCareer}) <= 300) AND (${table.rawStudentFirstName} IS NULL OR length(${table.rawStudentFirstName}) <= 200) AND (${table.rawStudentLastName} IS NULL OR length(${table.rawStudentLastName}) <= 200) AND (${table.rawConsultationDate} IS NULL OR length(${table.rawConsultationDate}) <= 100) AND (${table.rawTutor} IS NULL OR length(${table.rawTutor}) <= 300) AND (${table.rawAcademicStage} IS NULL OR length(${table.rawAcademicStage}) <= 200) AND (${table.rawModality} IS NULL OR length(${table.rawModality}) <= 100) AND (${table.rawTopic} IS NULL OR length(${table.rawTopic}) <= 4000) AND (${table.rawContact} IS NULL OR length(${table.rawContact}) <= 320)`,
    ),
    check(
      "consultation_staging_normalized_field_bounds_check",
      sql`(${table.normalizedCareer} IS NULL OR length(${table.normalizedCareer}) <= 300) AND (${table.normalizedStudentFirstName} IS NULL OR length(${table.normalizedStudentFirstName}) <= 200) AND (${table.normalizedStudentLastName} IS NULL OR length(${table.normalizedStudentLastName}) <= 200) AND (${table.normalizedTutor} IS NULL OR length(${table.normalizedTutor}) <= 300) AND (${table.normalizedAcademicStage} IS NULL OR length(${table.normalizedAcademicStage}) <= 200) AND (${table.normalizedModality} IS NULL OR length(${table.normalizedModality}) <= 100) AND (${table.normalizedTopic} IS NULL OR length(${table.normalizedTopic}) <= 4000) AND (${table.normalizedContact} IS NULL OR length(${table.normalizedContact}) <= 320)`,
    ),
    check(
      "consultation_staging_classification_subject_check",
      sql`(${table.classification} = 'SUBJECT' AND ${table.subjectId} IS NOT NULL) OR (${table.classification} <> 'SUBJECT' AND ${table.subjectId} IS NULL)`,
    ),
    check(
      "consultation_staging_review_state_check",
      sql`(${table.status} NOT IN ('READY', 'CONSOLIDATED', 'DUPLICATE') OR (${table.reviewedBy} IS NOT NULL AND ${table.reviewedAt} IS NOT NULL)) AND (${table.status} <> 'READY' OR (cardinality(${table.anomalyFlags}) = 0 AND ${table.classification} IN ('SUBJECT', 'GENERAL'))) AND (${table.status} <> 'CONSOLIDATED' OR ${table.classification} IN ('SUBJECT', 'GENERAL'))`,
    ),
    check(
      "consultation_staging_review_version_check",
      sql`${table.reviewVersion} > 0 AND ${table.sourceChangeCount} >= 0`,
    ),
    uniqueIndex("consultation_staging_source_identity_unique").on(
      table.sourceProvider,
      table.sourceSpreadsheetId,
      table.sourceTab,
      table.sourceRowKey,
    ),
    index("consultation_staging_pending_queue_idx")
      .on(table.normalizedConsultationDate, table.id)
      .where(sql`${table.status} = 'PENDING_REVIEW'`),
    index("consultation_staging_source_run_idx").on(
      table.lastSeenRunId,
    ),
    index("consultation_staging_career_idx")
      .on(table.careerId)
      .where(sql`${table.careerId} IS NOT NULL`),
    index("consultation_staging_tutor_idx")
      .on(table.tutorId)
      .where(sql`${table.tutorId} IS NOT NULL`),
    index("consultation_staging_subject_idx")
      .on(table.subjectId)
      .where(sql`${table.subjectId} IS NOT NULL`),
    index("consultation_staging_duplicate_resolution_idx")
      .on(
        table.careerId,
        table.tutorId,
        table.normalizedConsultationDate,
        table.normalizedStudentFirstName,
        table.normalizedStudentLastName,
      )
      .where(
        sql`${table.careerId} IS NOT NULL AND ${table.tutorId} IS NOT NULL AND ${table.normalizedConsultationDate} IS NOT NULL AND ${table.normalizedStudentFirstName} IS NOT NULL AND ${table.normalizedStudentLastName} IS NOT NULL`,
      ),
  ],
);

export const consultation = pgTable(
  "consultation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stagingId: uuid("staging_id")
      .notNull()
      .references(() => consultationStaging.id, { onDelete: "restrict" }),
    cycleId: uuid("cycle_id").references(() => administrativeCycle.id, {
      onDelete: "restrict",
    }),
    consultationDate: date("consultation_date", { mode: "string" }).notNull(),
    studentFirstName: text("student_first_name").notNull(),
    studentLastName: text("student_last_name").notNull(),
    studentContact: text("student_contact"),
    careerId: uuid("career_id")
      .notNull()
      .references(() => career.id, { onDelete: "restrict" }),
    tutorId: uuid("tutor_id")
      .notNull()
      .references(() => tutor.id, { onDelete: "restrict" }),
    academicStage: text("academic_stage"),
    modality: text("modality"),
    rawTopic: text("raw_topic"),
    classification: consultationClassificationEnum("classification").notNull(),
    subjectId: uuid("subject_id").references(() => subject.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "consultation_classification_subject_check",
      sql`(${table.classification} = 'SUBJECT' AND ${table.subjectId} IS NOT NULL) OR (${table.classification} = 'GENERAL' AND ${table.subjectId} IS NULL)`,
    ),
    check(
      "consultation_student_name_bounds_check",
      sql`length(trim(${table.studentFirstName})) BETWEEN 1 AND 200 AND length(trim(${table.studentLastName})) BETWEEN 1 AND 200 AND (${table.studentContact} IS NULL OR length(${table.studentContact}) <= 320) AND (${table.academicStage} IS NULL OR length(${table.academicStage}) <= 200) AND (${table.modality} IS NULL OR length(${table.modality}) <= 100) AND (${table.rawTopic} IS NULL OR length(${table.rawTopic}) <= 4000)`,
    ),
    uniqueIndex("consultation_staging_unique").on(table.stagingId),
    index("consultation_date_idx").on(table.consultationDate, table.id),
    index("consultation_classification_date_idx").on(
      table.classification,
      table.consultationDate,
    ),
    index("consultation_career_date_idx").on(
      table.careerId,
      table.consultationDate,
    ),
    index("consultation_tutor_date_idx").on(
      table.tutorId,
      table.consultationDate,
    ),
    index("consultation_subject_date_idx")
      .on(table.subjectId, table.consultationDate)
      .where(sql`${table.subjectId} IS NOT NULL`),
    index("consultation_cycle_date_idx")
      .on(table.cycleId, table.consultationDate)
      .where(sql`${table.cycleId} IS NOT NULL`),
  ],
);

export const consultationDuplicateCandidate = pgTable(
  "consultation_duplicate_candidate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstStagingId: uuid("first_staging_id")
      .notNull()
      .references(() => consultationStaging.id, { onDelete: "restrict" }),
    secondStagingId: uuid("second_staging_id")
      .notNull()
      .references(() => consultationStaging.id, { onDelete: "restrict" }),
    ruleCode: text("rule_code").notNull(),
    matchKeyHash: text("match_key_hash").notNull(),
    decision: consultationDuplicateDecisionEnum("decision")
      .notNull()
      .default("PENDING"),
    duplicateStagingId: uuid("duplicate_staging_id").references(
      () => consultationStaging.id,
      { onDelete: "restrict" },
    ),
    decidedBy: text("decided_by").references(() => user.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "consultation_duplicate_candidate_order_check",
      sql`${table.firstStagingId} < ${table.secondStagingId}`,
    ),
    check(
      "consultation_duplicate_candidate_rule_code_check",
      sql`${table.ruleCode} ~ '^[a-z0-9_]{1,80}$'`,
    ),
    check(
      "consultation_duplicate_candidate_match_hash_check",
      sql`${table.matchKeyHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "consultation_duplicate_candidate_decision_check",
      sql`(${table.decision} = 'PENDING' AND ${table.decidedBy} IS NULL AND ${table.decidedAt} IS NULL AND ${table.duplicateStagingId} IS NULL) OR (${table.decision} = 'NOT_DUPLICATE' AND ${table.decidedBy} IS NOT NULL AND ${table.decidedAt} IS NOT NULL AND ${table.duplicateStagingId} IS NULL) OR (${table.decision} = 'DUPLICATE' AND ${table.decidedBy} IS NOT NULL AND ${table.decidedAt} IS NOT NULL AND (${table.duplicateStagingId} IS NULL OR ${table.duplicateStagingId} IN (${table.firstStagingId}, ${table.secondStagingId})))`,
    ),
    uniqueIndex("consultation_duplicate_candidate_pair_unique").on(
      table.firstStagingId,
      table.secondStagingId,
    ),
    index("consultation_duplicate_candidate_decision_created_idx").on(
      table.decision,
      table.createdAt,
    ),
    index("consultation_duplicate_candidate_first_staging_idx").on(
      table.firstStagingId,
    ),
    index("consultation_duplicate_candidate_second_staging_idx").on(
      table.secondStagingId,
    ),
  ],
);

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata")
      .$type<SafeAuditMetadata>()
      .notNull()
      .default({}),
    requestId: text("request_id"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_event_actor_id_idx").on(table.actorId),
    index("audit_event_entity_idx").on(table.entityType, table.entityId),
    index("audit_event_action_idx").on(table.action),
    index("audit_event_created_at_idx").on(table.createdAt),
  ],
);

export const databaseSchema = {
  user,
  session,
  account,
  verification,
  administrativeCycle,
  career,
  subject,
  scholarshipReference,
  tutor,
  tutorSubject,
  tutorCycleMembership,
  schedulePlan,
  scheduleAssignment,
  dutyOccurrence,
  attendanceRecord,
  hourCategory,
  activity,
  hourMovement,
  consultationImportRun,
  consultationStaging,
  consultation,
  consultationDuplicateCandidate,
  auditEvent,
};

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type AdministrativeCycleStatus =
  (typeof administrativeCycleStatusEnum.enumValues)[number];
export type RecordStatus = (typeof recordStatusEnum.enumValues)[number];

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type AdministrativeCycle = typeof administrativeCycle.$inferSelect;
export type NewAdministrativeCycle = typeof administrativeCycle.$inferInsert;
export type Career = typeof career.$inferSelect;
export type NewCareer = typeof career.$inferInsert;
export type Subject = typeof subject.$inferSelect;
export type NewSubject = typeof subject.$inferInsert;
export type ScholarshipReference = typeof scholarshipReference.$inferSelect;
export type NewScholarshipReference = typeof scholarshipReference.$inferInsert;
export type Tutor = typeof tutor.$inferSelect;
export type NewTutor = typeof tutor.$inferInsert;
export type TutorSubject = typeof tutorSubject.$inferSelect;
export type NewTutorSubject = typeof tutorSubject.$inferInsert;
export type TutorCycleMembership = typeof tutorCycleMembership.$inferSelect;
export type NewTutorCycleMembership = typeof tutorCycleMembership.$inferInsert;
export type SchedulePlanKind = (typeof schedulePlanKindEnum.enumValues)[number];
export type ScheduleAssignmentPattern =
  (typeof scheduleAssignmentPatternEnum.enumValues)[number];
export type ScheduleAssignmentKind =
  (typeof scheduleAssignmentKindEnum.enumValues)[number];
export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number];
export type AttendanceDebitStatus =
  (typeof attendanceDebitStatusEnum.enumValues)[number];
export type ConsultationSourceProvider =
  (typeof consultationSourceProviderEnum.enumValues)[number];
export type ConsultationClassification =
  (typeof consultationClassificationEnum.enumValues)[number];
export type ConsultationStagingStatus =
  (typeof consultationStagingStatusEnum.enumValues)[number];
export type ConsultationImportRunStatus =
  (typeof consultationImportRunStatusEnum.enumValues)[number];
export type ConsultationDuplicateDecision =
  (typeof consultationDuplicateDecisionEnum.enumValues)[number];
export type ConsultationAnomalyCode =
  (typeof consultationAnomalyCodeEnum.enumValues)[number];
export type SchedulePlan = typeof schedulePlan.$inferSelect;
export type NewSchedulePlan = typeof schedulePlan.$inferInsert;
export type ScheduleAssignment = typeof scheduleAssignment.$inferSelect;
export type NewScheduleAssignment = typeof scheduleAssignment.$inferInsert;
export type DutyOccurrence = typeof dutyOccurrence.$inferSelect;
export type NewDutyOccurrence = typeof dutyOccurrence.$inferInsert;
export type AttendanceRecord = typeof attendanceRecord.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecord.$inferInsert;
export type HourMovementDirection =
  (typeof hourMovementDirectionEnum.enumValues)[number];
export type ActivityKind = (typeof activityKindEnum.enumValues)[number];
export type HourCategory = typeof hourCategory.$inferSelect;
export type NewHourCategory = typeof hourCategory.$inferInsert;
export type Activity = typeof activity.$inferSelect;
export type NewActivity = typeof activity.$inferInsert;
export type HourMovement = typeof hourMovement.$inferSelect;
export type NewHourMovement = typeof hourMovement.$inferInsert;
export type ConsultationImportRun = typeof consultationImportRun.$inferSelect;
export type NewConsultationImportRun = typeof consultationImportRun.$inferInsert;
export type ConsultationStaging = typeof consultationStaging.$inferSelect;
export type NewConsultationStaging = typeof consultationStaging.$inferInsert;
export type Consultation = typeof consultation.$inferSelect;
export type NewConsultation = typeof consultation.$inferInsert;
export type ConsultationDuplicateCandidate =
  typeof consultationDuplicateCandidate.$inferSelect;
export type NewConsultationDuplicateCandidate =
  typeof consultationDuplicateCandidate.$inferInsert;
export type AuditEvent = typeof auditEvent.$inferSelect;
