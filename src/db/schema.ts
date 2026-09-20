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
    index("hour_movement_category_idx").on(table.categoryId),
    index("hour_movement_activity_idx").on(table.activityId),
    index("hour_movement_attendance_idx").on(table.attendanceRecordId),
    uniqueIndex("hour_movement_reversal_unique")
      .on(table.reversalOfMovementId)
      .where(sql`${table.reversalOfMovementId} IS NOT NULL`),
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
export type AuditEvent = typeof auditEvent.$inferSelect;
