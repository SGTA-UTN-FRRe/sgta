import { and, eq, inArray, or, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getDatabase: vi.fn(),
  getSession: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: authMocks.headers }));
vi.mock("next/navigation", () => ({ redirect: authMocks.redirect }));
vi.mock("@/auth/index", () => ({ getAuth: authMocks.getAuth }));
vi.mock("@/db/client", () => ({ getDatabase: authMocks.getDatabase }));

import { GET as getAdminCycles } from "@/app/api/admin/cycles/route";
import { GET as getAdminHours } from "@/app/api/admin/hours/route";
import {
  GET as getAdminHourMovements,
  POST as postAdminHourMovement,
} from "@/app/api/admin/hours/movements/route";
import { POST as postAdminHourMovementReverse } from "@/app/api/admin/hours/movements/[movementId]/reverse/route";
import { GET as getAdminConsultations } from "@/app/api/admin/consultations/route";
import {
  GET as getAdminConsultationReview,
  PATCH as patchAdminConsultationReview,
} from "@/app/api/admin/consultations/review/[stagingId]/route";
import { GET as getAdminTutorDetail, PATCH as patchAdminTutorDetail } from "@/app/api/admin/tutors/[tutorId]/route";
import { PATCH as patchAdminTutorStatus } from "@/app/api/admin/tutors/[tutorId]/status/route";
import {
  GET as getAdminTutorCollection,
  POST as postAdminTutorCollection,
} from "@/app/api/admin/tutors/route";
import { GET as getAdminTutorSubjects } from "@/app/api/admin/tutors/subjects/route";
import { GET as getTutorHours } from "@/app/api/tutor/hours/route";
import { GET as getTutorSchedule } from "@/app/api/tutor/schedule/route";
import { GET as getTutorSummary } from "@/app/api/tutor/summary/route";
import { GET as getAdminScheduleWorkspace } from "@/app/api/admin/schedules/route";
import { GET as getAdminAttendanceCollection } from "@/app/api/admin/schedules/attendance/route";
import {
  GET as getAdminAttendanceOccurrence,
  POST as postAdminAttendance,
} from "@/app/api/admin/schedules/attendance/[occurrenceId]/route";
import AdminLayout from "@/app/admin/layout";
import { GET as getAdminCareerDetail, PATCH as patchAdminCareerDetail } from "@/app/api/admin/settings/careers/[careerId]/route";
import { PATCH as patchAdminCareerStatus } from "@/app/api/admin/settings/careers/[careerId]/status/route";
import { GET as getAdminCareers, POST as postAdminCareers } from "@/app/api/admin/settings/careers/route";
import { GET as getAdminScholarshipDetail, PATCH as patchAdminScholarshipDetail } from "@/app/api/admin/settings/scholarship-references/[scholarshipReferenceId]/route";
import { PATCH as patchAdminScholarshipStatus } from "@/app/api/admin/settings/scholarship-references/[scholarshipReferenceId]/status/route";
import { GET as getAdminScholarships, POST as postAdminScholarships } from "@/app/api/admin/settings/scholarship-references/route";
import { GET as getAdminSubjectDetail, PATCH as patchAdminSubjectDetail } from "@/app/api/admin/settings/subjects/[subjectId]/route";
import { PATCH as patchAdminSubjectStatus } from "@/app/api/admin/settings/subjects/[subjectId]/status/route";
import { GET as getAdminSubjects, POST as postAdminSubjects } from "@/app/api/admin/settings/subjects/route";
import {
  GET as getAdminHourCategories,
  POST as postAdminHourCategory,
} from "@/app/api/admin/settings/hour-categories/route";
import { PATCH as patchAdminHourCategory } from "@/app/api/admin/settings/hour-categories/[categoryId]/route";
import { PATCH as patchAdminHourCategoryStatus } from "@/app/api/admin/settings/hour-categories/[categoryId]/status/route";
import { requireApiRole, requireRole } from "@/auth/authorization";
import { createAuthOptions } from "@/auth/options";
import type { AuthEnvironment } from "@/auth/options";
import { recordAuditEvent, listAuditEvents } from "@/db/audit-core";
import {
  account,
  activity,
  administrativeCycle,
  attendanceRecord,
  auditEvent,
  career,
  consultation,
  consultationDuplicateCandidate,
  consultationImportRun,
  consultationStaging,
  dutyOccurrence,
  hourCategory,
  hourMovement,
  scholarshipReference,
  session,
  scheduleAssignment,
  schedulePlan,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
} from "@/db/schema";
import {
  closeAdministrativeCycle,
  createAdministrativeCycle,
  getCurrentAdministrativeCycle,
  listAdministrativeCycles,
} from "@/features/cycles/cycle-service";
import {
  createHourCategory,
  getHourWorkspace,
  HOUR_ERROR_CODES,
  listHourBalances,
  listHourMovements,
  recognizeRecovery,
  recordBulkHourMovement,
  reverseHourMovement,
  transitionHourCategoryStatus,
} from "@/features/hours/hour-service";
import {
  createCareer,
  createScholarshipReference,
  createSubject,
  createTutor,
  getActiveCatalogOptions,
  getTutorDetail,
  listSubjectCoverage,
  listTutors,
  TUTOR_ERROR_CODES,
  transitionCareerStatus,
  transitionScholarshipReferenceStatus,
  transitionSubjectStatus,
  transitionTutorStatus,
  updateScholarshipReference,
  updateTutor,
} from "@/features/tutors/tutor-service";
import {
  createScheduleAssignment,
  createSchedulePlan,
  listScheduleAssignments,
  listSchedulePlans,
  resolveEffectivePlan,
  resolveEffectiveSchedule,
  SCHEDULE_ERROR_CODES,
  transitionSchedulePlanStatus,
  updateScheduleAssignment,
} from "@/features/schedules/schedule-service";
import {
  ATTENDANCE_ERROR_CODES,
  cancelAbsenceDebit,
  confirmAbsenceDebit,
  correctAttendance,
  getAttendanceOccurrence,
  listAttendanceForDate,
  recognizeScheduledRecovery,
  reopenAbsenceDebit,
  setAttendanceStatus,
} from "@/features/schedules/attendance-service";
import {
  getTutorSelfServiceHours,
  getTutorSelfServiceSchedule,
  getTutorSelfServiceSummary,
} from "@/features/tutor-self-service/tutor-self-service-service";
import { provisionUser } from "@/auth/provisioning";
import { importConsultationRows } from "@/features/consultations/consultation-import-service";
import {
  ConsultationSourceError,
  CONSULTATION_SOURCE_ERROR_CODES,
  type ConsultationSourceAdapter,
} from "@/features/consultations/consultation-source";
import {
  CONSULTATION_ERROR_CODES,
  decideConsultationReview,
  getConsultationReview,
  getConsultationWorkspace,
} from "@/features/consultations/consultation-service";
import { consultationSourceConfigSchema } from "@/features/consultations/consultation-validation";

import {
  getIntegrationConnectionString,
  getIntegrationDatabase,
  POSTGRES_IMAGE,
} from "./setup";

const authEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://integration.invalid/sgta",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "integration-only-secret-123456789012345",
  GOOGLE_CLIENT_ID: "integration-google-client-id",
  GOOGLE_CLIENT_SECRET: "integration-google-client-secret",
  GOOGLE_HOSTED_DOMAIN: undefined,
  TEST_DATABASE_URL: undefined,
} satisfies AuthEnvironment;

async function resetDatabase() {
  await getIntegrationDatabase().execute(
    sql`TRUNCATE TABLE "consultation_duplicate_candidate", "consultation", "consultation_staging", "consultation_import_run", "hour_movement", "activity", "attendance_record", "duty_occurrence", "schedule_assignment", "schedule_plan", "hour_category", "tutor_cycle_membership", "tutor_subject", "tutor", "scholarship_reference", "subject", "career", "audit_event", "session", "account", "verification", "administrative_cycle", "user" CASCADE`,
  );
}

async function seedIdentities() {
  const database = getIntegrationDatabase();
  const admin = await provisionUser(
    database,
    {
      email: "admin.integration@example.test",
      name: "Integration Admin",
      role: "ADMIN",
      enabled: true,
    },
    { source: "bootstrap" },
  );
  const tutor = await provisionUser(
    database,
    {
      email: "tutor.integration@example.test",
      name: "Integration Tutor",
      role: "TUTOR",
      enabled: true,
    },
    { actorId: admin.id, source: "admin" },
  );
  const disabled = await provisionUser(
    database,
    {
      email: "disabled.integration@example.test",
      name: "Disabled Identity",
      role: "TUTOR",
      enabled: false,
    },
    { actorId: admin.id, source: "admin" },
  );

  return { admin, tutor, disabled };
}

function getRows<T>(result: { rows: unknown[] }) {
  return result.rows as T[];
}

function postgresIdentifier(identifier: string) {
  return identifier.slice(0, 63);
}

async function expectPostgresErrorCode(
  operation: Promise<unknown>,
  code: string,
) {
  const error = await operation.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).not.toBeNull();
  const queryError = error as {
    code?: string;
    cause?: { code?: string };
  };
  expect(queryError.code ?? queryError.cause?.code).toBe(code);
}

function makeJsonRequest(
  url: string,
  method: "GET" | "PATCH" | "POST" = "GET",
  body?: unknown,
) {
  return new Request(url, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

async function seedConsultationReviewData(adminId: string) {
  const database = getIntegrationDatabase();
  const now = new Date("2026-09-22T12:00:00.000Z");
  const [careerRecord] = await database
    .insert(career)
    .values({
      name: "Historical Engineering",
      normalizedName: "historical engineering",
      status: "INACTIVE",
    })
    .returning();
  if (careerRecord === undefined) {
    throw new Error("The consultation review Career fixture was not created.");
  }
  const [subjectRecord] = await database
    .insert(subject)
    .values({
      careerId: careerRecord.id,
      name: "Historical Algebra",
      normalizedName: "historical algebra",
      status: "INACTIVE",
    })
    .returning();
  const [tutorRecord] = await database
    .insert(tutor)
    .values({
      firstName: "Review",
      lastName: "Tutor",
      preferredDisplayName: "Review Tutor",
      primaryCareerId: careerRecord.id,
      status: "INACTIVE",
    })
    .returning();
  const [run] = await database
    .insert(consultationImportRun)
    .values({
      actorId: adminId,
      status: "SUCCEEDED",
      sourceSpreadsheetId: "consultation-review-fixture",
      sourceRange: "Review!A:I",
      startedAt: now,
      completedAt: now,
    })
    .returning();
  if (subjectRecord === undefined || tutorRecord === undefined || run === undefined) {
    throw new Error("The consultation review reference fixtures were not created.");
  }

  async function insertStaging(
    sourceRowKey: string,
    overrides: Partial<typeof consultationStaging.$inferInsert> = {},
  ) {
    const [staging] = await database
      .insert(consultationStaging)
      .values({
        sourceSpreadsheetId: "consultation-review-fixture",
        sourceTab: "Review",
        sourceRowKey,
        sourceFingerprint: "d".repeat(64),
        firstSeenRunId: run.id,
        lastSeenRunId: run.id,
        rawCareer: "Historical Engineering",
        rawStudentFirstName: "Private Student",
        rawStudentLastName: "Example",
        rawConsultationDate: "22/09/2026",
        rawTutor: "Review Tutor",
        rawAcademicStage: "Second year",
        rawModality: "Virtual",
        rawTopic: "Private source topic",
        rawContact: "student.contact@example.test",
        normalizedCareer: "historical engineering",
        careerId: careerRecord.id,
        normalizedStudentFirstName: "private student",
        normalizedStudentLastName: "example",
        normalizedConsultationDate: "2026-09-22",
        normalizedTutor: "review tutor",
        tutorId: tutorRecord.id,
        normalizedAcademicStage: "second year",
        normalizedModality: "virtual",
        normalizedTopic: "private source topic",
        normalizedContact: "student.contact@example.test",
        ...overrides,
      })
      .returning();
    if (staging === undefined) {
      throw new Error("The consultation review staging fixture was not created.");
    }
    return staging;
  }

  return { careerRecord, subjectRecord, tutorRecord, insertStaging, now };
}

beforeEach(async () => {
  await resetDatabase();
  vi.clearAllMocks();
  authMocks.getDatabase.mockReturnValue(getIntegrationDatabase());
  authMocks.headers.mockResolvedValue(
    new Headers({ cookie: "better-auth.session=integration" }),
  );
  authMocks.getAuth.mockReturnValue({
    api: { getSession: authMocks.getSession },
  });
  authMocks.getSession.mockResolvedValue(null);
  authMocks.redirect.mockImplementation((path: string) => {
    throw new Error(`redirect:${path}`);
  });
});

describe("PostgreSQL foundation integration", () => {
  it("applies the pinned migration to the isolated container and reruns it safely", async () => {
    const database = getIntegrationDatabase();
    const tables = getRows<{ table_name: string }>(
      await database.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('user', 'session', 'account', 'verification', 'administrative_cycle', 'audit_event', 'career', 'subject', 'scholarship_reference', 'tutor', 'tutor_subject', 'tutor_cycle_membership', 'schedule_plan', 'schedule_assignment', 'duty_occurrence', 'attendance_record', 'hour_category', 'activity', 'hour_movement', 'consultation_import_run', 'consultation_staging', 'consultation', 'consultation_duplicate_candidate')
        ORDER BY table_name
      `),
    );
    const migrations = getRows<{ migration_count: string }>(
      await database.execute(sql`
        SELECT count(*)::text AS migration_count
        FROM "drizzle"."__drizzle_migrations"
      `),
    );
    const indexes = getRows<{ indexname: string }>(
      await database.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'activity_cycle_date_idx',
            'activity_duty_occurrence_idx',
            'activity_kind_idx',
            'attendance_record_occurrence_unique',
            'attendance_record_status_idx',
            'career_normalized_name_unique',
            'consultation_date_idx',
            'consultation_classification_date_idx',
            'consultation_career_date_idx',
            'consultation_tutor_date_idx',
            'consultation_subject_date_idx',
            'consultation_cycle_date_idx',
            'consultation_staging_unique',
            'consultation_duplicate_candidate_pair_unique',
            'consultation_duplicate_candidate_decision_created_idx',
            'consultation_duplicate_candidate_first_staging_idx',
            'consultation_duplicate_candidate_second_staging_idx',
            'consultation_import_run_active_source_unique',
            'consultation_import_run_status_started_idx',
            'consultation_import_run_actor_started_idx',
            'consultation_staging_source_identity_unique',
            'consultation_staging_review_updated_idx',
            'consultation_staging_source_run_idx',
            'consultation_staging_career_idx',
            'consultation_staging_tutor_idx',
            'consultation_staging_subject_idx',
            'consultation_staging_duplicate_resolution_idx',
            'duty_occurrence_assignment_date_unique',
            'duty_occurrence_cycle_date_idx',
            'duty_occurrence_tutor_date_idx',
            'hour_category_normalized_name_unique',
            'hour_category_status_idx',
            'hour_movement_activity_idx',
            'hour_movement_attendance_idx',
            'hour_movement_category_idx',
            'hour_movement_cycle_tutor_date_idx',
            'hour_movement_reversal_unique',
            'schedule_assignment_date_idx',
            'schedule_assignment_plan_status_idx',
            'schedule_assignment_tutor_status_idx',
            'schedule_plan_active_regular_unique',
            'schedule_plan_cycle_status_idx',
            'schedule_plan_cycle_validity_idx',
            'subject_career_normalized_name_unique',
            'tutor_application_user_unique',
            'tutor_institutional_identifier_unique',
            'tutor_primary_career_idx',
            'tutor_status_idx',
            'tutor_cycle_membership_cycle_idx',
            'tutor_cycle_membership_scholarship_reference_idx',
            'tutor_subject_subject_idx'
          )
        ORDER BY indexname
      `),
    );
    const foreignKeys = getRows<{ conname: string }>(
      await database.execute(sql`
        SELECT conname
        FROM pg_constraint
          WHERE contype = 'f'
        AND (
          conname IN (
            'activity_actor_id_user_id_fk',
            'activity_cycle_id_administrative_cycle_id_fk',
            'activity_duty_occurrence_id_duty_occurrence_id_fk',
            'attendance_record_actor_id_user_id_fk',
            'attendance_record_occurrence_id_duty_occurrence_id_fk',
            'duty_occurrence_assignment_id_schedule_assignment_id_fk',
            'duty_occurrence_cycle_id_administrative_cycle_id_fk',
            'duty_occurrence_plan_id_schedule_plan_id_fk',
            'duty_occurrence_tutor_id_tutor_id_fk',
            'hour_movement_activity_id_activity_id_fk',
            'hour_movement_actor_id_user_id_fk',
            'hour_movement_attendance_record_id_attendance_record_id_fk',
            'hour_movement_category_id_hour_category_id_fk',
            'hour_movement_cycle_id_administrative_cycle_id_fk',
            'hour_movement_reversal_of_movement_id_hour_movement_id_fk',
            'hour_movement_tutor_id_tutor_id_fk',
            'schedule_assignment_plan_id_schedule_plan_id_fk',
            'schedule_assignment_tutor_id_tutor_id_fk',
            'schedule_plan_cycle_id_administrative_cycle_id_fk',
            'subject_career_id_career_id_fk',
            'tutor_application_user_id_user_id_fk',
            'tutor_primary_career_id_career_id_fk',
            'tutor_cycle_membership_tutor_id_tutor_id_fk',
            'tutor_cycle_membership_cycle_id_administrative_cycle_id_fk',
            'tutor_cycle_membership_scholarship_reference_id_scholarship_reference_id_fk',
            'tutor_subject_tutor_id_tutor_id_fk',
            'tutor_subject_subject_id_subject_id_fk'
          )
          OR conrelid::regclass::text IN (
            'consultation',
            'consultation_duplicate_candidate',
            'consultation_import_run',
            'consultation_staging'
          )
        )
        ORDER BY conname
      `),
    );
    const checks = getRows<{ conname: string }>(
      await database.execute(sql`
        SELECT conname
        FROM pg_constraint
          WHERE contype = 'c'
          AND conname IN (
            'activity_duration_minutes_positive_check',
            'activity_note_not_blank_check',
            'attendance_record_proposed_debit_minutes_check',
            'attendance_record_recognized_debit_minutes_check',
            'career_name_not_blank_check',
            'career_normalized_name_not_blank_check',
            'career_normalized_name_check',
            'consultation_import_run_counts_non_negative_check',
            'consultation_import_run_completion_check',
            'consultation_import_run_source_bounds_check',
            'consultation_import_run_error_code_check',
            'consultation_import_run_request_id_check',
            'consultation_staging_source_identity_bounds_check',
            'consultation_staging_source_fingerprint_check',
            'consultation_staging_anomaly_flags_bounds_check',
            'consultation_staging_acknowledged_anomalies_bounds_check',
            'consultation_staging_raw_field_bounds_check',
            'consultation_staging_normalized_field_bounds_check',
            'consultation_staging_classification_subject_check',
            'consultation_staging_review_state_check',
            'consultation_staging_review_version_check',
            'consultation_classification_subject_check',
            'consultation_student_name_bounds_check',
            'consultation_duplicate_candidate_order_check',
            'consultation_duplicate_candidate_rule_code_check',
            'consultation_duplicate_candidate_match_hash_check',
            'consultation_duplicate_candidate_decision_check',
            'hour_category_name_not_blank_check',
            'hour_category_normalized_name_not_blank_check',
            'hour_category_normalized_name_check',
            'hour_movement_duration_minutes_positive_check',
            'hour_movement_note_not_blank_check',
            'hour_movement_not_self_reversal_check',
            'duty_occurrence_modality_not_blank_check',
            'duty_occurrence_time_range_check',
            'schedule_assignment_modality_not_blank_check',
            'schedule_assignment_pattern_check',
            'schedule_assignment_time_range_check',
            'schedule_assignment_weekday_check',
            'schedule_plan_name_not_blank_check',
            'schedule_plan_validity_check',
            'subject_name_not_blank_check',
            'subject_normalized_name_not_blank_check',
            'subject_normalized_name_check',
            'scholarship_reference_type_not_blank_check',
            'scholarship_reference_normalized_type_not_blank_check',
            'scholarship_reference_normalized_type_check',
            'scholarship_reference_hours_non_negative_check',
            'tutor_first_name_not_blank_check',
            'tutor_last_name_not_blank_check',
            'tutor_preferred_display_name_check',
            'tutor_institutional_identifier_check',
            'tutor_institutional_identifier_normalized_check'
          )
        ORDER BY conname
      `),
    );
    const enumValues = getRows<{ typname: string; enumlabel: string }>(
      await database.execute(sql`
        SELECT type.typname, enum.enumlabel
        FROM pg_type AS type
        JOIN pg_enum AS enum ON enum.enumtypid = type.oid
        WHERE type.typname IN ('user_role', 'administrative_cycle_status', 'record_status', 'hour_movement_direction', 'activity_kind', 'schedule_plan_kind', 'schedule_assignment_pattern', 'schedule_assignment_kind', 'attendance_status', 'attendance_debit_status', 'consultation_source_provider', 'consultation_classification', 'consultation_staging_status', 'consultation_import_run_status', 'consultation_duplicate_decision', 'consultation_anomaly_code')
        ORDER BY type.typname, enum.enumsortorder
      `),
    );

    expect(POSTGRES_IMAGE).toBe("postgres:16.4-alpine");
    expect(tables.map((row) => row.table_name)).toEqual([
      "account",
      "activity",
      "administrative_cycle",
      "attendance_record",
      "audit_event",
      "career",
      "consultation",
      "consultation_duplicate_candidate",
      "consultation_import_run",
      "consultation_staging",
      "duty_occurrence",
      "hour_category",
      "hour_movement",
      "schedule_assignment",
      "schedule_plan",
      "scholarship_reference",
      "session",
      "subject",
      "tutor",
      "tutor_cycle_membership",
      "tutor_subject",
      "user",
      "verification",
    ]);
    expect(migrations[0]?.migration_count).toBe("8");
    expect(enumValues).toEqual([
      { typname: "activity_kind", enumlabel: "MEETING" },
      { typname: "activity_kind", enumlabel: "WORKSHOP" },
      { typname: "activity_kind", enumlabel: "EXTRAORDINARY" },
      { typname: "activity_kind", enumlabel: "RECOVERY" },
      { typname: "administrative_cycle_status", enumlabel: "OPEN" },
      { typname: "administrative_cycle_status", enumlabel: "CLOSED" },
      { typname: "attendance_debit_status", enumlabel: "NOT_PROPOSED" },
      { typname: "attendance_debit_status", enumlabel: "PROPOSED" },
      { typname: "attendance_debit_status", enumlabel: "CANCELLED" },
      { typname: "attendance_debit_status", enumlabel: "CONFIRMED" },
      { typname: "attendance_status", enumlabel: "PENDING" },
      { typname: "attendance_status", enumlabel: "PRESENT" },
      { typname: "attendance_status", enumlabel: "ABSENT" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_SOURCE_ROW_KEY" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_CAREER" },
      { typname: "consultation_anomaly_code", enumlabel: "UNRESOLVED_CAREER" },
      { typname: "consultation_anomaly_code", enumlabel: "AMBIGUOUS_CAREER" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_STUDENT_FIRST_NAME" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_STUDENT_LAST_NAME" },
      { typname: "consultation_anomaly_code", enumlabel: "INVALID_CONSULTATION_DATE" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_TUTOR" },
      { typname: "consultation_anomaly_code", enumlabel: "UNRESOLVED_TUTOR" },
      { typname: "consultation_anomaly_code", enumlabel: "AMBIGUOUS_TUTOR" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_ACADEMIC_STAGE" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_MODALITY" },
      { typname: "consultation_anomaly_code", enumlabel: "MISSING_TOPIC" },
      { typname: "consultation_anomaly_code", enumlabel: "POSSIBLE_DUPLICATE" },
      { typname: "consultation_anomaly_code", enumlabel: "SOURCE_ROW_CHANGED" },
      { typname: "consultation_classification", enumlabel: "SUBJECT" },
      { typname: "consultation_classification", enumlabel: "GENERAL" },
      { typname: "consultation_classification", enumlabel: "PENDING_CLASSIFICATION" },
      { typname: "consultation_duplicate_decision", enumlabel: "PENDING" },
      { typname: "consultation_duplicate_decision", enumlabel: "DUPLICATE" },
      { typname: "consultation_duplicate_decision", enumlabel: "NOT_DUPLICATE" },
      { typname: "consultation_import_run_status", enumlabel: "RUNNING" },
      { typname: "consultation_import_run_status", enumlabel: "SUCCEEDED" },
      { typname: "consultation_import_run_status", enumlabel: "PARTIAL" },
      { typname: "consultation_import_run_status", enumlabel: "FAILED" },
      { typname: "consultation_source_provider", enumlabel: "GOOGLE_SHEETS" },
      { typname: "consultation_staging_status", enumlabel: "PENDING_REVIEW" },
      { typname: "consultation_staging_status", enumlabel: "READY" },
      { typname: "consultation_staging_status", enumlabel: "CONSOLIDATED" },
      { typname: "consultation_staging_status", enumlabel: "DUPLICATE" },
      { typname: "hour_movement_direction", enumlabel: "CREDIT" },
      { typname: "hour_movement_direction", enumlabel: "DEBIT" },
      { typname: "record_status", enumlabel: "ACTIVE" },
      { typname: "record_status", enumlabel: "INACTIVE" },
      { typname: "schedule_assignment_kind", enumlabel: "DUTY" },
      { typname: "schedule_assignment_kind", enumlabel: "RECOVERY" },
      { typname: "schedule_assignment_pattern", enumlabel: "WEEKDAY" },
      { typname: "schedule_assignment_pattern", enumlabel: "DATE" },
      { typname: "schedule_plan_kind", enumlabel: "REGULAR" },
      { typname: "schedule_plan_kind", enumlabel: "SPECIAL" },
      { typname: "user_role", enumlabel: "ADMIN" },
      { typname: "user_role", enumlabel: "TUTOR" },
    ]);
    expect(indexes.map((row) => row.indexname)).toEqual([
      "activity_cycle_date_idx",
      "activity_duty_occurrence_idx",
      "activity_kind_idx",
      "attendance_record_occurrence_unique",
      "attendance_record_status_idx",
      "career_normalized_name_unique",
      "consultation_career_date_idx",
      "consultation_classification_date_idx",
      "consultation_cycle_date_idx",
      "consultation_date_idx",
      "consultation_duplicate_candidate_decision_created_idx",
      "consultation_duplicate_candidate_first_staging_idx",
      "consultation_duplicate_candidate_pair_unique",
      "consultation_duplicate_candidate_second_staging_idx",
      "consultation_import_run_active_source_unique",
      "consultation_import_run_actor_started_idx",
      "consultation_import_run_status_started_idx",
      "consultation_staging_career_idx",
      "consultation_staging_duplicate_resolution_idx",
      "consultation_staging_review_updated_idx",
      "consultation_staging_source_identity_unique",
      "consultation_staging_source_run_idx",
      "consultation_staging_subject_idx",
      "consultation_staging_tutor_idx",
      "consultation_staging_unique",
      "consultation_subject_date_idx",
      "consultation_tutor_date_idx",
      "duty_occurrence_assignment_date_unique",
      "duty_occurrence_cycle_date_idx",
      "duty_occurrence_tutor_date_idx",
      "hour_category_normalized_name_unique",
      "hour_category_status_idx",
      "hour_movement_activity_idx",
      "hour_movement_attendance_idx",
      "hour_movement_category_idx",
      "hour_movement_cycle_tutor_date_idx",
      "hour_movement_reversal_unique",
      "schedule_assignment_date_idx",
      "schedule_assignment_plan_status_idx",
      "schedule_assignment_tutor_status_idx",
      "schedule_plan_active_regular_unique",
      "schedule_plan_cycle_status_idx",
      "schedule_plan_cycle_validity_idx",
      "subject_career_normalized_name_unique",
      "tutor_application_user_unique",
      "tutor_cycle_membership_cycle_idx",
      "tutor_cycle_membership_scholarship_reference_idx",
      "tutor_institutional_identifier_unique",
      "tutor_primary_career_idx",
      "tutor_status_idx",
      "tutor_subject_subject_idx",
    ]);
    expect(foreignKeys.map((row) => row.conname)).toEqual([
      "activity_actor_id_user_id_fk",
      "activity_cycle_id_administrative_cycle_id_fk",
      "activity_duty_occurrence_id_duty_occurrence_id_fk",
      "attendance_record_actor_id_user_id_fk",
      "attendance_record_occurrence_id_duty_occurrence_id_fk",
      "duty_occurrence_assignment_id_schedule_assignment_id_fk",
      "duty_occurrence_cycle_id_administrative_cycle_id_fk",
      "duty_occurrence_plan_id_schedule_plan_id_fk",
      "duty_occurrence_tutor_id_tutor_id_fk",
      "hour_movement_activity_id_activity_id_fk",
      "hour_movement_actor_id_user_id_fk",
      "hour_movement_attendance_record_id_attendance_record_id_fk",
      "hour_movement_category_id_hour_category_id_fk",
      "hour_movement_cycle_id_administrative_cycle_id_fk",
      "hour_movement_reversal_of_movement_id_hour_movement_id_fk",
      "hour_movement_tutor_id_tutor_id_fk",
      "schedule_assignment_plan_id_schedule_plan_id_fk",
      "schedule_assignment_tutor_id_tutor_id_fk",
      "schedule_plan_cycle_id_administrative_cycle_id_fk",
      "subject_career_id_career_id_fk",
      "tutor_application_user_id_user_id_fk",
      "tutor_cycle_membership_cycle_id_administrative_cycle_id_fk",
      "tutor_cycle_membership_scholarship_reference_id_scholarship_ref",
      "tutor_cycle_membership_tutor_id_tutor_id_fk",
      "tutor_primary_career_id_career_id_fk",
      "tutor_subject_subject_id_subject_id_fk",
      "tutor_subject_tutor_id_tutor_id_fk",
      "consultation_staging_id_consultation_staging_id_fk",
      "consultation_cycle_id_administrative_cycle_id_fk",
      "consultation_career_id_career_id_fk",
      "consultation_tutor_id_tutor_id_fk",
      "consultation_subject_id_subject_id_fk",
      postgresIdentifier(
        "consultation_duplicate_candidate_first_staging_id_consultation_staging_id_fk",
      ),
      postgresIdentifier(
        "consultation_duplicate_candidate_second_staging_id_consultation_staging_id_fk",
      ),
      postgresIdentifier(
        "consultation_duplicate_candidate_duplicate_staging_id_consultation_staging_id_fk",
      ),
      postgresIdentifier("consultation_duplicate_candidate_decided_by_user_id_fk"),
      "consultation_import_run_actor_id_user_id_fk",
      postgresIdentifier(
        "consultation_staging_first_seen_run_id_consultation_import_run_id_fk",
      ),
      postgresIdentifier(
        "consultation_staging_last_seen_run_id_consultation_import_run_id_fk",
      ),
      "consultation_staging_career_id_career_id_fk",
      "consultation_staging_tutor_id_tutor_id_fk",
      "consultation_staging_subject_id_subject_id_fk",
      postgresIdentifier("consultation_staging_reviewed_by_user_id_fk"),
    ].sort());
    expect(checks.map((row) => row.conname)).toEqual([
      "activity_duration_minutes_positive_check",
      "activity_note_not_blank_check",
      "attendance_record_proposed_debit_minutes_check",
      "attendance_record_recognized_debit_minutes_check",
      "career_name_not_blank_check",
      "career_normalized_name_check",
      "career_normalized_name_not_blank_check",
      "consultation_classification_subject_check",
      "consultation_student_name_bounds_check",
      "consultation_duplicate_candidate_order_check",
      "consultation_duplicate_candidate_rule_code_check",
      "consultation_duplicate_candidate_match_hash_check",
      "consultation_duplicate_candidate_decision_check",
      "consultation_import_run_counts_non_negative_check",
      "consultation_import_run_completion_check",
      "consultation_import_run_source_bounds_check",
      "consultation_import_run_error_code_check",
      "consultation_import_run_request_id_check",
      "consultation_staging_source_identity_bounds_check",
      "consultation_staging_source_fingerprint_check",
      "consultation_staging_anomaly_flags_bounds_check",
      "consultation_staging_acknowledged_anomalies_bounds_check",
      "consultation_staging_raw_field_bounds_check",
      "consultation_staging_normalized_field_bounds_check",
      "consultation_staging_classification_subject_check",
      "consultation_staging_review_state_check",
      "consultation_staging_review_version_check",
      "duty_occurrence_modality_not_blank_check",
      "duty_occurrence_time_range_check",
      "hour_category_name_not_blank_check",
      "hour_category_normalized_name_check",
      "hour_category_normalized_name_not_blank_check",
      "hour_movement_duration_minutes_positive_check",
      "hour_movement_not_self_reversal_check",
      "hour_movement_note_not_blank_check",
      "schedule_assignment_modality_not_blank_check",
      "schedule_assignment_pattern_check",
      "schedule_assignment_time_range_check",
      "schedule_assignment_weekday_check",
      "schedule_plan_name_not_blank_check",
      "schedule_plan_validity_check",
      "scholarship_reference_hours_non_negative_check",
      "scholarship_reference_normalized_type_check",
      "scholarship_reference_normalized_type_not_blank_check",
      "scholarship_reference_type_not_blank_check",
      "subject_name_not_blank_check",
      "subject_normalized_name_check",
      "subject_normalized_name_not_blank_check",
      "tutor_first_name_not_blank_check",
      "tutor_institutional_identifier_check",
      "tutor_institutional_identifier_normalized_check",
      "tutor_last_name_not_blank_check",
      "tutor_preferred_display_name_check",
    ].sort());
    expect(getIntegrationConnectionString()).toMatch(
      /^postgres(?:ql)?:\/\/[^/]+\/sgta_integration$/,
    );
  });

  it("enforces consultation source identity and canonical classification constraints", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });

    if (createdCareer === undefined) {
      throw new Error("The consultation fixture Career was not created.");
    }

    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Casey",
        lastName: "Tutor",
        primaryCareerId: createdCareer.id,
      })
      .returning({ id: tutor.id });

    if (createdTutor === undefined) {
      throw new Error("The consultation fixture Tutor was not created.");
    }

    const [createdSubject] = await database
      .insert(subject)
      .values({
        careerId: createdCareer.id,
        name: "Discrete Mathematics",
        normalizedName: "discrete mathematics",
      })
      .returning({ id: subject.id });

    if (createdSubject === undefined) {
      throw new Error("The consultation fixture Subject was not created.");
    }

    const [run] = await database
      .insert(consultationImportRun)
      .values({
        actorId: admin.id,
        status: "SUCCEEDED",
        sourceSpreadsheetId: "synthetic-sheet-id",
        sourceRange: "Responses 1!A:I",
        completedAt: new Date(),
      })
      .returning({ id: consultationImportRun.id });

    if (run === undefined) {
      throw new Error("The consultation fixture import run was not created.");
    }

    const insertStaging = (
      sourceRowKey: string,
      overrides: Partial<typeof consultationStaging.$inferInsert> = {},
    ) =>
      database
        .insert(consultationStaging)
        .values({
          sourceProvider: "GOOGLE_SHEETS",
          sourceSpreadsheetId: "synthetic-sheet-id",
          sourceTab: "Responses 1",
          sourceRowKey,
          sourceFingerprint: "a".repeat(64),
          firstSeenRunId: run.id,
          lastSeenRunId: run.id,
          ...overrides,
        })
        .returning({ id: consultationStaging.id });

    const [generalStaging] = await insertStaging("row-general");
    const [subjectStaging] = await insertStaging("row-subject");
    const [subjectWithoutSubjectStaging] = await insertStaging(
      "row-subject-without-subject",
    );
    const [generalWithSubjectStaging] = await insertStaging(
      "row-general-with-subject",
    );
    const [pendingClassificationStaging] = await insertStaging(
      "row-pending-classification",
    );

    if (
      generalStaging === undefined ||
      subjectStaging === undefined ||
      subjectWithoutSubjectStaging === undefined ||
      generalWithSubjectStaging === undefined ||
      pendingClassificationStaging === undefined
    ) {
      throw new Error("The consultation staging fixtures were not created.");
    }

    const canonicalFields = {
      consultationDate: "2026-09-22",
      studentFirstName: "Ana",
      studentLastName: "Pérez",
      careerId: createdCareer.id,
      tutorId: createdTutor.id,
      academicStage: "Second year",
      modality: "Virtual",
      rawTopic: "Synthetic topic",
    };

    await database.insert(consultation).values({
      ...canonicalFields,
      stagingId: generalStaging.id,
      classification: "GENERAL",
      subjectId: null,
    });
    await database.insert(consultation).values({
      ...canonicalFields,
      stagingId: subjectStaging.id,
      classification: "SUBJECT",
      subjectId: createdSubject.id,
    });

    await expectPostgresErrorCode(
      insertStaging("row-general"),
      "23505",
    );
    await expectPostgresErrorCode(
      database.insert(consultation).values({
        ...canonicalFields,
        stagingId: generalStaging.id,
        classification: "GENERAL",
        subjectId: null,
      }),
      "23505",
    );
    await expectPostgresErrorCode(
      database.insert(consultation).values({
        ...canonicalFields,
        stagingId: subjectWithoutSubjectStaging.id,
        classification: "SUBJECT",
        subjectId: null,
      }),
      "23514",
    );
    await expectPostgresErrorCode(
      database.insert(consultation).values({
        ...canonicalFields,
        stagingId: generalWithSubjectStaging.id,
        classification: "GENERAL",
        subjectId: createdSubject.id,
      }),
      "23514",
    );
    await expectPostgresErrorCode(
      database.insert(consultation).values({
        ...canonicalFields,
        stagingId: pendingClassificationStaging.id,
        classification: "PENDING_CLASSIFICATION",
        subjectId: null,
      }),
      "23514",
    );
    await expectPostgresErrorCode(
      insertStaging("row-invalid-fingerprint", {
        sourceFingerprint: "not-a-fingerprint",
      }),
      "23514",
    );
    await expectPostgresErrorCode(
      insertStaging("row-oversized-name", {
        rawStudentFirstName: "A".repeat(201),
      }),
      "23514",
    );
    await expectPostgresErrorCode(
      insertStaging("row-many-anomalies", {
        anomalyFlags: Array.from(
          { length: 33 },
          () => "MISSING_CAREER" as const,
        ),
      }),
      "23514",
    );
    await expectPostgresErrorCode(
      insertStaging("row-ready-pending-classification", {
        status: "READY",
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      }),
      "23514",
    );

    const canonicalRows = await database
      .select({ classification: consultation.classification })
      .from(consultation);
    expect(canonicalRows.map((row) => row.classification)).toEqual([
      "GENERAL",
      "SUBJECT",
    ]);
    await expectPostgresErrorCode(
      database.delete(career).where(eq(career.id, createdCareer.id)),
      "23503",
    );
  });

  it("imports source rows idempotently, reopens changed reviews, and preserves canonical data", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    if (createdCareer === undefined) {
      throw new Error("The import fixture Career was not created.");
    }

    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Casey",
        lastName: "Tutor",
        preferredDisplayName: "Casey Tutor",
        primaryCareerId: createdCareer.id,
      })
      .returning({ id: tutor.id });
    if (createdTutor === undefined) {
      throw new Error("The import fixture Tutor was not created.");
    }

    const config = consultationSourceConfigSchema.parse({
      spreadsheetId: "synthetic-import-sheet",
      range: "Responses!A:I",
      serviceAccountEmail: "consultations@example.test",
      privateKey:
        "-----BEGIN PRIVATE KEY-----\nsynthetic-integration-key\n-----END PRIVATE KEY-----",
      headerMap: {
        career: "Career",
        studentFirstName: "First name",
        studentLastName: "Last name",
        consultationDate: "Date",
        tutor: "Tutor",
        academicStage: "Stage",
        modality: "Modality",
        topic: "Topic",
        contact: "Contact",
      },
    });
    const sourceConfiguration = { status: "configured" as const, config };
    const sourceRow = (sourceRowKey: string, sourceFingerprint: string, topic: string) => ({
      sourceRowKey,
      sourceFingerprint: sourceFingerprint.repeat(64),
      career: "Computer Science",
      studentFirstName: "Ana",
      studentLastName: "Diaz",
      consultationDate: "22/09/2026",
      tutor: "Casey Tutor",
      academicStage: "Second year",
      modality: "Virtual",
      topic,
      contact: "ana@example.test",
    });

    let sourceRows = [sourceRow("row:2", "a", "Original topic")];
    let sourceFailure = false;
    let sourceReadCount = 0;
    const sourceAdapter: ConsultationSourceAdapter = {
      async readRows() {
        sourceReadCount += 1;
        if (sourceFailure) {
          throw new ConsultationSourceError(CONSULTATION_SOURCE_ERROR_CODES.unavailable);
        }
        return { sourceTab: "Responses", rows: sourceRows };
      },
    };
    let currentTime = new Date("2026-09-22T12:00:00.000Z");
    const dependencies = {
      db: database,
      sourceConfiguration,
      sourceAdapter,
      now: () => new Date(currentTime),
    };

    const firstImport = await importConsultationRows({ actorId: admin.id }, dependencies);
    expect(firstImport).toMatchObject({
      outcome: "completed",
      summary: { status: "SUCCEEDED", newRows: 1, alreadyProcessedRows: 0, reviewRows: 1 },
    });

    const [stagingBeforeReview] = await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.sourceRowKey, "row:2"));
    if (stagingBeforeReview === undefined) {
      throw new Error("The import staging row was not created.");
    }

    await database
      .update(consultationStaging)
      .set({
        status: "CONSOLIDATED",
        classification: "GENERAL",
        reviewedBy: admin.id,
        reviewedAt: currentTime,
        anomalyFlags: [],
      })
      .where(eq(consultationStaging.id, stagingBeforeReview.id));
    await database.insert(consultation).values({
      stagingId: stagingBeforeReview.id,
      consultationDate: "2026-09-22",
      studentFirstName: "Ana",
      studentLastName: "Diaz",
      studentContact: "ana@example.test",
      careerId: createdCareer.id,
      tutorId: createdTutor.id,
      academicStage: "Second year",
      modality: "Virtual",
      rawTopic: "Original topic",
      classification: "GENERAL",
      subjectId: null,
    });

    currentTime = new Date("2026-09-22T12:01:00.000Z");
    sourceRows = [
      sourceRow("row:2", "b", "Changed source topic"),
      sourceRow("row:3", "c", "Same consultation from another row"),
      {
        ...sourceRow("row:4", "d", ""),
        career: "Unlisted career",
        tutor: "Unlisted tutor",
        consultationDate: "09/22/2026",
        academicStage: "",
        modality: "",
      },
    ];
    const changedImport = await importConsultationRows({ actorId: admin.id }, dependencies);
    expect(changedImport).toMatchObject({
      outcome: "completed",
      summary: {
        status: "SUCCEEDED",
        newRows: 2,
        alreadyProcessedRows: 0,
        reviewRows: 3,
        duplicateCandidates: 1,
      },
    });

    const [anomalyStaging] = await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.sourceRowKey, "row:4"));
    expect(anomalyStaging?.anomalyFlags).toEqual(
      expect.arrayContaining([
        "UNRESOLVED_CAREER",
        "UNRESOLVED_TUTOR",
        "INVALID_CONSULTATION_DATE",
        "MISSING_TOPIC",
        "MISSING_ACADEMIC_STAGE",
        "MISSING_MODALITY",
      ]),
    );

    const [reopenedStaging] = await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.id, stagingBeforeReview.id));
    const [preservedCanonical] = await database
      .select()
      .from(consultation)
      .where(eq(consultation.stagingId, stagingBeforeReview.id));
    expect(reopenedStaging).toMatchObject({
      status: "PENDING_REVIEW",
      classification: "PENDING_CLASSIFICATION",
      rawTopic: "Changed source topic",
      sourceChangeCount: 1,
      sourceChangedAt: currentTime,
    });
    expect(reopenedStaging?.anomalyFlags).toEqual(
      expect.arrayContaining(["SOURCE_ROW_CHANGED", "POSSIBLE_DUPLICATE"]),
    );
    expect(preservedCanonical).toMatchObject({
      classification: "GENERAL",
      rawTopic: "Original topic",
    });
    const [duplicateCandidate] = await database
      .select()
      .from(consultationDuplicateCandidate);
    if (duplicateCandidate === undefined) {
      throw new Error("The exact duplicate candidate was not created.");
    }

    const duplicateStaging = (await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.sourceSpreadsheetId, config.spreadsheetId)))
      .filter((row) => row.sourceRowKey === "row:2" || row.sourceRowKey === "row:3");
    expect(duplicateStaging).toHaveLength(2);
    for (const row of duplicateStaging) {
      await database
        .update(consultationStaging)
        .set({
          status: "CONSOLIDATED",
          classification: "GENERAL",
          reviewedBy: admin.id,
          reviewedAt: currentTime,
        })
        .where(eq(consultationStaging.id, row.id));
    }
    const secondDuplicateRow = duplicateStaging.find((row) => row.sourceRowKey === "row:3");
    if (secondDuplicateRow === undefined) {
      throw new Error("The second duplicate staging row was not found.");
    }
    await database.insert(consultation).values({
      stagingId: secondDuplicateRow.id,
      consultationDate: "2026-09-22",
      studentFirstName: "Ana",
      studentLastName: "Diaz",
      studentContact: "ana@example.test",
      careerId: createdCareer.id,
      tutorId: createdTutor.id,
      academicStage: "Second year",
      modality: "Virtual",
      rawTopic: "Same consultation from another row",
      classification: "GENERAL",
      subjectId: null,
    });
    await database
      .update(consultationDuplicateCandidate)
      .set({ decision: "NOT_DUPLICATE", decidedBy: admin.id, decidedAt: currentTime })
      .where(eq(consultationDuplicateCandidate.id, duplicateCandidate.id));

    currentTime = new Date("2026-09-22T12:02:00.000Z");
    const repeatedImport = await importConsultationRows({ actorId: admin.id }, dependencies);
    expect(repeatedImport).toMatchObject({
      outcome: "completed",
      summary: {
        newRows: 0,
        alreadyProcessedRows: 3,
        reviewRows: 1,
        duplicateCandidates: 1,
      },
    });
    const repeatedDuplicateRows = (await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.sourceSpreadsheetId, config.spreadsheetId)))
      .filter((row) => row.sourceRowKey === "row:2" || row.sourceRowKey === "row:3");
    expect(repeatedDuplicateRows.map((row) => row.status)).toEqual([
      "CONSOLIDATED",
      "CONSOLIDATED",
    ]);
    const [repeatedCandidate] = await database
      .select()
      .from(consultationDuplicateCandidate)
      .where(eq(consultationDuplicateCandidate.id, duplicateCandidate.id));
    expect(repeatedCandidate?.decision).toBe("NOT_DUPLICATE");

    sourceFailure = true;
    currentTime = new Date("2026-09-22T12:03:00.000Z");
    const unavailableImport = await importConsultationRows(
      { actorId: admin.id },
      dependencies,
    );
    expect(unavailableImport).toMatchObject({
      outcome: "failed",
      summary: { status: "FAILED", errorCode: "source_unavailable" },
    });
    expect(await database.select().from(consultation)).toHaveLength(2);
    expect(await database.select().from(consultationStaging)).toHaveLength(3);

    const failedAudit = await database
      .select({ metadata: auditEvent.metadata })
      .from(auditEvent)
      .where(eq(auditEvent.entityId, unavailableImport.summary.runId!));
    expect(JSON.stringify(failedAudit)).not.toContain("Ana");
    expect(JSON.stringify(failedAudit)).not.toContain("ana@example.test");
    expect(JSON.stringify(failedAudit)).toContain("source_unavailable");

    const missingConfiguration = await importConsultationRows(
      { actorId: admin.id },
      {
        ...dependencies,
        sourceConfiguration: { status: "unavailable", code: "source_not_configured" },
      },
    );
    expect(missingConfiguration).toMatchObject({
      outcome: "failed",
      summary: { status: "FAILED", errorCode: "source_not_configured" },
    });
    expect(sourceReadCount).toBe(4);
    expect(await database.select().from(consultation)).toHaveLength(2);
  });

  it("resolves explicit references, consolidates atomically, and makes decision retries idempotent", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const fixtures = await seedConsultationReviewData(admin.id);
    const staging = await fixtures.insertStaging("task3-explicit-resolution", {
      rawCareer: null,
      rawTutor: null,
      rawConsultationDate: "not a date",
      normalizedCareer: null,
      careerId: null,
      normalizedTutor: null,
      tutorId: null,
      normalizedConsultationDate: null,
      anomalyFlags: [
        "MISSING_CAREER",
        "MISSING_TUTOR",
        "INVALID_CONSULTATION_DATE",
        "SOURCE_ROW_CHANGED",
      ],
    });
    await database.insert(administrativeCycle).values({
      name: "Historical Consultation Cycle",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "CLOSED",
    });

    const reviewBefore = await getConsultationReview(database, staging.id);
    expect(reviewBefore.references.careers).toContainEqual(
      expect.objectContaining({ id: fixtures.careerRecord.id, status: "INACTIVE" }),
    );
    expect(reviewBefore.references.tutors).toContainEqual(
      expect.objectContaining({ id: fixtures.tutorRecord.id, status: "INACTIVE" }),
    );
    expect(reviewBefore.references.subjects).toContainEqual(
      expect.objectContaining({ id: fixtures.subjectRecord.id, status: "INACTIVE" }),
    );

    const decision = {
      expectedVersion: 1,
      careerId: fixtures.careerRecord.id,
      tutorId: fixtures.tutorRecord.id,
      consultationDate: "2026-09-22",
      classification: "SUBJECT" as const,
      subjectId: fixtures.subjectRecord.id,
      acknowledgedAnomalies: ["SOURCE_ROW_CHANGED" as const],
    };
    const context = {
      actorId: admin.id,
      requestId: "consultation-review-atomic-test",
      ipAddress: "192.0.2.10",
    };
    const result = await decideConsultationReview(
      database,
      staging.id,
      decision,
      context,
    );

    expect(result.outcome).toBe("consolidated");
    expect(result.review).toMatchObject({
      status: "CONSOLIDATED",
      classification: "SUBJECT",
      acknowledgedAnomalies: ["SOURCE_ROW_CHANGED"],
      canonical: {
        classification: "SUBJECT",
        subject: "Historical Algebra",
        career: "Historical Engineering",
        tutor: "Review Tutor",
      },
    });
    const [canonical] = await database
      .select()
      .from(consultation)
      .where(eq(consultation.stagingId, staging.id));
    expect(canonical).toMatchObject({
      cycleId: expect.any(String),
      subjectId: fixtures.subjectRecord.id,
      studentContact: "student.contact@example.test",
    });

    await expect(
      decideConsultationReview(database, staging.id, decision, context),
    ).resolves.toMatchObject({ outcome: "consolidated" });
    expect(
      await database
        .select()
        .from(consultation)
        .where(eq(consultation.stagingId, staging.id)),
    ).toHaveLength(1);

    const auditRows = await database
      .select({ actorId: auditEvent.actorId, action: auditEvent.action, metadata: auditEvent.metadata })
      .from(auditEvent)
      .where(
        and(
          inArray(auditEvent.action, ["consultation_review.decided", "consultation.consolidated"]),
          or(eq(auditEvent.entityId, staging.id), eq(auditEvent.entityType, "consultation")),
        ),
      );
    expect(auditRows).toHaveLength(2);
    expect(auditRows.every((event) => event.actorId === admin.id)).toBe(true);
    expect(JSON.stringify(auditRows)).not.toContain("Private Student");
    expect(JSON.stringify(auditRows)).not.toContain("student.contact@example.test");
    expect(JSON.stringify(auditRows)).not.toContain("Private source topic");

    const workspace = await getConsultationWorkspace(database, {});
    expect(workspace).toMatchObject({
      rows: [{ stagingId: staging.id, classification: "SUBJECT" }],
      reviewQueue: [],
      pendingReviewCount: 0,
      totalRows: 1,
    });
  });

  it("rejects stale decisions and keeps pending classifications out of canonical rows", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const fixtures = await seedConsultationReviewData(admin.id);
    const canonicalStage = await fixtures.insertStaging("task3-stale-review");
    await decideConsultationReview(
      database,
      canonicalStage.id,
      { expectedVersion: 1, classification: "GENERAL" },
      { actorId: admin.id },
    );

    await expect(
      decideConsultationReview(
        database,
        canonicalStage.id,
        {
          expectedVersion: 1,
          classification: "SUBJECT",
          subjectId: fixtures.subjectRecord.id,
        },
        { actorId: admin.id },
      ),
    ).rejects.toMatchObject({ code: CONSULTATION_ERROR_CODES.staleReview });

    const pendingStage = await fixtures.insertStaging("task3-pending-classification");
    const pendingDecision = await decideConsultationReview(
      database,
      pendingStage.id,
      { expectedVersion: 1, acknowledgedAnomalies: [] },
      { actorId: admin.id },
    );
    expect(pendingDecision.outcome).toBe("review_saved");
    expect(pendingDecision.review.status).toBe("PENDING_REVIEW");
    expect(pendingDecision.review.canonical).toBeNull();

    const workspace = await getConsultationWorkspace(database, {});
    expect(workspace.rows).toHaveLength(1);
    expect(workspace.reviewQueue).toEqual([
      expect.objectContaining({
        stagingId: pendingStage.id,
        classification: "PENDING_CLASSIFICATION",
        hasCanonical: false,
      }),
    ]);
    const subjectResults = await getConsultationWorkspace(database, {
      classification: "SUBJECT",
    });
    expect(subjectResults.rows).toEqual([]);
  });

  it("retains confirmed duplicate evidence and rolls back a decision when audit persistence fails", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const fixtures = await seedConsultationReviewData(admin.id);
    const duplicate = await fixtures.insertStaging("task3-confirmed-duplicate", {
      anomalyFlags: ["POSSIBLE_DUPLICATE"],
    });
    const survivor = await fixtures.insertStaging("task3-duplicate-survivor", {
      anomalyFlags: ["POSSIBLE_DUPLICATE"],
    });
    const [candidate] = await database
      .insert(consultationDuplicateCandidate)
      .values({
        firstStagingId: duplicate.id < survivor.id ? duplicate.id : survivor.id,
        secondStagingId: duplicate.id < survivor.id ? survivor.id : duplicate.id,
        ruleCode: "exact_person_date_career_tutor",
        matchKeyHash: "e".repeat(64),
      })
      .returning();
    if (candidate === undefined) {
      throw new Error("The duplicate candidate fixture was not created.");
    }

    const duplicateResult = await decideConsultationReview(
      database,
      duplicate.id,
      {
        expectedVersion: 1,
        duplicateDecisions: [{ candidateId: candidate.id, decision: "DUPLICATE" }],
      },
      { actorId: admin.id },
    );
    expect(duplicateResult.outcome).toBe("duplicate");
    expect(duplicateResult.review.status).toBe("DUPLICATE");
    expect(await database.select().from(consultation)).toHaveLength(0);
    expect(await database.select().from(consultationStaging)).toHaveLength(2);
    const [confirmedCandidate] = await database
      .select()
      .from(consultationDuplicateCandidate)
      .where(eq(consultationDuplicateCandidate.id, candidate.id));
    expect(confirmedCandidate).toMatchObject({
      decision: "DUPLICATE",
      duplicateStagingId: duplicate.id,
      decidedBy: admin.id,
    });
    await expect(
      decideConsultationReview(
        database,
        survivor.id,
        {
          expectedVersion: 1,
          duplicateDecisions: [{ candidateId: candidate.id, decision: "DUPLICATE" }],
        },
        { actorId: admin.id },
      ),
    ).rejects.toMatchObject({
      code: CONSULTATION_ERROR_CODES.duplicateDecisionConflict,
    });

    const rollbackRow = await fixtures.insertStaging("task3-audit-rollback", {
      anomalyFlags: ["POSSIBLE_DUPLICATE"],
    });
    const rollbackPeer = await fixtures.insertStaging("task3-audit-rollback-peer", {
      anomalyFlags: ["POSSIBLE_DUPLICATE"],
    });
    const [rollbackCandidate] = await database
      .insert(consultationDuplicateCandidate)
      .values({
        firstStagingId: rollbackRow.id < rollbackPeer.id ? rollbackRow.id : rollbackPeer.id,
        secondStagingId: rollbackRow.id < rollbackPeer.id ? rollbackPeer.id : rollbackRow.id,
        ruleCode: "exact_person_date_career_tutor",
        matchKeyHash: "f".repeat(64),
      })
      .returning();
    if (rollbackCandidate === undefined) {
      throw new Error("The rollback duplicate candidate fixture was not created.");
    }

    await expect(
      decideConsultationReview(
        database,
        rollbackRow.id,
        {
          expectedVersion: 1,
          duplicateDecisions: [
            { candidateId: rollbackCandidate.id, decision: "DUPLICATE" },
          ],
        },
        { actorId: admin.id, requestId: "r".repeat(256) },
      ),
    ).rejects.toMatchObject({
      code: CONSULTATION_ERROR_CODES.transactionFailed,
    });
    const [unchangedStaging] = await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.id, rollbackRow.id));
    const [unchangedCandidate] = await database
      .select()
      .from(consultationDuplicateCandidate)
      .where(eq(consultationDuplicateCandidate.id, rollbackCandidate.id));
    expect(unchangedStaging).toMatchObject({
      status: "PENDING_REVIEW",
      reviewVersion: 1,
    });
    expect(unchangedCandidate).toMatchObject({
      decision: "PENDING",
      duplicateStagingId: null,
      decidedBy: null,
    });
  });

  it("enforces database-backed Admin authorization on consultation APIs", async () => {
    const database = getIntegrationDatabase();
    const { admin, tutor: tutorIdentity } = await seedIdentities();
    const fixtures = await seedConsultationReviewData(admin.id);
    const staging = await fixtures.insertStaging("task3-admin-route-auth");
    const detailRequest = new Request(
      `http://localhost/api/admin/consultations/review/${staging.id}`,
    );
    const listRequest = new Request("http://localhost/api/admin/consultations");
    const reviewContext = { params: Promise.resolve({ stagingId: staging.id }) };

    authMocks.getSession.mockResolvedValue({ user: { id: tutorIdentity.id } });
    const tutorResponses = await Promise.all([
      getAdminConsultations(listRequest),
      getAdminConsultationReview(detailRequest, reviewContext),
      patchAdminConsultationReview(
        makeJsonRequest(
          `http://localhost/api/admin/consultations/review/${staging.id}`,
          "PATCH",
          { expectedVersion: 1, classification: "GENERAL" },
        ),
        reviewContext,
      ),
    ]);
    expect(tutorResponses.map((response) => response.status)).toEqual([
      403,
      403,
      403,
    ]);
    expect(tutorResponses.every((response) => response.headers.get("Cache-Control") === "no-store")).toBe(true);
    const [unchanged] = await database
      .select()
      .from(consultationStaging)
      .where(eq(consultationStaging.id, staging.id));
    expect(unchanged).toMatchObject({ status: "PENDING_REVIEW", reviewVersion: 1 });

    authMocks.getSession.mockResolvedValue({ user: { id: admin.id } });
    const adminWorkspace = await getAdminConsultations(listRequest);
    const adminDetail = await getAdminConsultationReview(detailRequest, reviewContext);
    expect(adminWorkspace.status).toBe(200);
    expect(adminDetail.status).toBe(200);
    const adminDecision = await patchAdminConsultationReview(
      makeJsonRequest(
        `http://localhost/api/admin/consultations/review/${staging.id}`,
        "PATCH",
        { expectedVersion: 1, classification: "GENERAL" },
      ),
      reviewContext,
    );
    expect(adminDecision.status).toBe(200);
    expect(await adminDecision.json()).toMatchObject({
      outcome: "consolidated",
      review: { status: "CONSOLIDATED", classification: "GENERAL" },
    });
  });

  it("rejects a concurrent source read and recovers an expired import lease", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const config = consultationSourceConfigSchema.parse({
      spreadsheetId: "synthetic-lease-sheet",
      range: "Responses!A:I",
      serviceAccountEmail: "consultations@example.test",
      privateKey:
        "-----BEGIN PRIVATE KEY-----\nsynthetic-integration-key\n-----END PRIVATE KEY-----",
      headerMap: {
        career: "Career",
        studentFirstName: "First name",
        studentLastName: "Last name",
        consultationDate: "Date",
        tutor: "Tutor",
        academicStage: "Stage",
        modality: "Modality",
        topic: "Topic",
      },
    });
    const sourceConfiguration = { status: "configured" as const, config };
    const fixedTime = new Date("2026-09-22T13:00:00.000Z");
    let signalStarted: (() => void) | undefined;
    let releaseRead: ((batch: { sourceTab: string; rows: unknown[] }) => void) | undefined;
    const readStarted = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const blockedRead = new Promise<{ sourceTab: string; rows: unknown[] }>((resolve) => {
      releaseRead = resolve;
    });
    const sourceAdapter: ConsultationSourceAdapter = {
      readRows: vi.fn(() => {
        signalStarted?.();
        return blockedRead;
      }),
    };
    const dependencies = {
      db: database,
      sourceConfiguration,
      sourceAdapter,
      now: () => new Date(fixedTime),
    };

    const activeImport = importConsultationRows({ actorId: admin.id }, dependencies);
    await readStarted;
    const concurrentImport = await importConsultationRows(
      { actorId: admin.id },
      dependencies,
    );
    expect(concurrentImport).toMatchObject({
      outcome: "conflict",
      summary: { status: "RUNNING", errorCode: null },
    });
    expect(sourceAdapter.readRows).toHaveBeenCalledOnce();
    releaseRead?.({ sourceTab: "Responses", rows: [] });
    expect(await activeImport).toMatchObject({ outcome: "completed" });

    const [expiredRun] = await database
      .insert(consultationImportRun)
      .values({
        actorId: admin.id,
        status: "RUNNING",
        sourceSpreadsheetId: config.spreadsheetId,
        sourceRange: config.range,
        startedAt: new Date(fixedTime.getTime() - 31 * 60 * 1000),
      })
      .returning({ id: consultationImportRun.id });
    if (expiredRun === undefined) {
      throw new Error("The expired import lease fixture was not created.");
    }

    const activeRunsBeforeRecovery = await database
      .select({ id: consultationImportRun.id, startedAt: consultationImportRun.startedAt })
      .from(consultationImportRun)
      .where(
        and(
          eq(consultationImportRun.status, "RUNNING"),
          eq(consultationImportRun.sourceSpreadsheetId, config.spreadsheetId),
          eq(consultationImportRun.sourceRange, config.range),
        ),
      );
    expect(activeRunsBeforeRecovery.map((run) => run.id)).toEqual([expiredRun.id]);

    const recoveredImport = await importConsultationRows(
      { actorId: admin.id },
      {
        ...dependencies,
        sourceAdapter: { async readRows() { return { sourceTab: "Responses", rows: [] }; } },
      },
    );
    expect(recoveredImport.outcome).toBe("completed");
    const [recoveredRun] = await database
      .select()
      .from(consultationImportRun)
      .where(eq(consultationImportRun.id, expiredRun.id));
    expect(recoveredRun).toMatchObject({
      status: "FAILED",
      errorCode: "import_lease_expired",
    });
  });

  it("persists hour accounting facts and enforces non-destructive constraints", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    const [createdCategory] = await database
      .insert(hourCategory)
      .values({
        name: "Meeting",
        normalizedName: "meeting",
        activityKind: "MEETING",
      })
      .returning({ id: hourCategory.id });
    const [createdActivity] = await database
      .insert(activity)
      .values({
        cycleId: createdCycle!.id,
        kind: "MEETING",
        activityDate: "2027-02-01",
        durationMinutes: 90,
        note: "Weekly coordination",
        actorId: admin.id,
      })
      .returning({ id: activity.id });
    const movementId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const [createdMovement] = await database
      .insert(hourMovement)
      .values({
        id: movementId,
        cycleId: createdCycle!.id,
        tutorId: createdTutor!.id,
        categoryId: createdCategory!.id,
        direction: "CREDIT",
        durationMinutes: 90,
        movementDate: "2027-02-01",
        activityId: createdActivity!.id,
        actorId: admin.id,
      })
      .returning({
        direction: hourMovement.direction,
        durationMinutes: hourMovement.durationMinutes,
        reversalOfMovementId: hourMovement.reversalOfMovementId,
      });

    expect(createdMovement).toEqual({
      direction: "CREDIT",
      durationMinutes: 90,
      reversalOfMovementId: null,
    });

    await expect(
      database.insert(hourCategory).values({
        name: " meeting ",
        normalizedName: "meeting",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(hourCategory).values({ name: "   ", normalizedName: "" }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(activity).values({
        cycleId: createdCycle!.id,
        kind: "MEETING",
        activityDate: "2027-02-02",
        durationMinutes: 0,
        actorId: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(hourMovement).values({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        cycleId: createdCycle!.id,
        tutorId: createdTutor!.id,
        categoryId: createdCategory!.id,
        direction: "CREDIT",
        durationMinutes: 0,
        movementDate: "2027-02-02",
        actorId: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    const selfReversalId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await expect(
      database.insert(hourMovement).values({
        id: selfReversalId,
        cycleId: createdCycle!.id,
        tutorId: createdTutor!.id,
        categoryId: createdCategory!.id,
        direction: "DEBIT",
        durationMinutes: 90,
        movementDate: "2027-02-02",
        reversalOfMovementId: selfReversalId,
        actorId: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    const [createdReversal] = await database
      .insert(hourMovement)
      .values({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        cycleId: createdCycle!.id,
        tutorId: createdTutor!.id,
        categoryId: createdCategory!.id,
        direction: "DEBIT",
        durationMinutes: 90,
        movementDate: "2027-02-02",
        reversalOfMovementId: movementId,
        actorId: admin.id,
      })
      .returning({ reversalOfMovementId: hourMovement.reversalOfMovementId });

    expect(createdReversal?.reversalOfMovementId).toBe(movementId);
    await expect(
      database.insert(hourMovement).values({
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        cycleId: createdCycle!.id,
        tutorId: createdTutor!.id,
        categoryId: createdCategory!.id,
        direction: "DEBIT",
        durationMinutes: 90,
        movementDate: "2027-02-03",
        reversalOfMovementId: movementId,
        actorId: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });

    await expect(
      database.delete(hourCategory).where(eq(hourCategory.id, createdCategory!.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      database.delete(activity).where(eq(activity.id, createdActivity!.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });

    const [storedMovement] = await database
      .select({
        direction: hourMovement.direction,
        durationMinutes: hourMovement.durationMinutes,
        reversalOfMovementId: hourMovement.reversalOfMovementId,
      })
      .from(hourMovement)
      .where(eq(hourMovement.id, movementId));

    expect(storedMovement).toEqual({
      direction: "CREDIT",
      durationMinutes: 90,
      reversalOfMovementId: null,
    });
  });

  it("persists schedule and attendance facts with structural constraints", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Schedule Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    const [createdPlan] = await database
      .insert(schedulePlan)
      .values({
        cycleId: createdCycle!.id,
        name: "Regular 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      })
      .returning({ id: schedulePlan.id });
    const [createdAssignment] = await database
      .insert(scheduleAssignment)
      .values({
        planId: createdPlan!.id,
        tutorId: createdTutor!.id,
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
        modality: "Room 204",
      })
      .returning({ id: scheduleAssignment.id });
    const [createdOccurrence] = await database
      .insert(dutyOccurrence)
      .values({
        cycleId: createdCycle!.id,
        planId: createdPlan!.id,
        assignmentId: createdAssignment!.id,
        tutorId: createdTutor!.id,
        occurrenceDate: "2027-01-04",
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
        modality: "Room 204",
      })
      .returning({ id: dutyOccurrence.id });
    const [createdAttendance] = await database
      .insert(attendanceRecord)
      .values({
        occurrenceId: createdOccurrence!.id,
        status: "ABSENT",
        debitStatus: "CANCELLED",
        proposedDebitMinutes: 120,
        actorId: admin.id,
      })
      .returning({
        status: attendanceRecord.status,
        debitStatus: attendanceRecord.debitStatus,
        proposedDebitMinutes: attendanceRecord.proposedDebitMinutes,
      });

    expect(createdAttendance).toEqual({
      status: "ABSENT",
      debitStatus: "CANCELLED",
      proposedDebitMinutes: 120,
    });

    await expect(
      database.insert(schedulePlan).values({
        cycleId: createdCycle!.id,
        name: "Invalid dates",
        kind: "SPECIAL",
        validFrom: "2027-02-01",
        validTo: "2027-01-31",
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(schedulePlan).values({
        cycleId: createdCycle!.id,
        name: "Second regular",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(scheduleAssignment).values({
        planId: createdPlan!.id,
        tutorId: createdTutor!.id,
        pattern: "WEEKDAY",
        startMinutes: 480,
        endMinutes: 600,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(scheduleAssignment).values({
        planId: createdPlan!.id,
        tutorId: createdTutor!.id,
        pattern: "DATE",
        assignmentDate: "2027-01-05",
        startMinutes: 600,
        endMinutes: 600,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(scheduleAssignment).values({
        planId: createdPlan!.id,
        tutorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        pattern: "DATE",
        assignmentDate: "2027-01-05",
        startMinutes: 600,
        endMinutes: 660,
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      database.insert(dutyOccurrence).values({
        cycleId: createdCycle!.id,
        planId: createdPlan!.id,
        assignmentId: createdAssignment!.id,
        tutorId: createdTutor!.id,
        occurrenceDate: "2027-01-04",
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(attendanceRecord).values({
        occurrenceId: createdOccurrence!.id,
        status: "PENDING",
        debitStatus: "NOT_PROPOSED",
        proposedDebitMinutes: -1,
        actorId: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(attendanceRecord).values({
        occurrenceId: createdOccurrence!.id,
        status: "PRESENT",
        debitStatus: "NOT_PROPOSED",
        actorId: admin.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.delete(schedulePlan).where(eq(schedulePlan.id, createdPlan!.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
  });

  it("resolves effective plans, preserves plan history, and materializes stable occurrences", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Schedule Services 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    const context = { actorId: admin.id };
    const regular = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Regular 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      },
      context,
    );
    const regularAssignment = await createScheduleAssignment(
      database,
      {
        planId: regular.id,
        tutorId: createdTutor!.id,
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
        modality: "Room 204",
      },
      context,
    );
    const special = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Exam Week",
        kind: "SPECIAL",
        validFrom: "2027-03-08",
        validTo: "2027-03-12",
      },
      context,
    );
    const specialAssignment = await createScheduleAssignment(
      database,
      {
        planId: special.id,
        tutorId: createdTutor!.id,
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 600,
        endMinutes: 720,
        kind: "RECOVERY",
        modality: "Room 305",
      },
      context,
    );

    await expect(
      resolveEffectivePlan(database, {
        cycleId: createdCycle!.id,
        date: "2027-03-01",
      }),
    ).resolves.toMatchObject({ id: regular.id, kind: "REGULAR" });
    await expect(
      resolveEffectivePlan(database, {
        cycleId: createdCycle!.id,
        date: "2027-03-08",
      }),
    ).resolves.toMatchObject({ id: special.id, kind: "SPECIAL" });

    const regularSchedule = await resolveEffectiveSchedule(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-01" },
      context,
    );
    const regularOccurrence = regularSchedule.occurrences[0];
    expect(regularOccurrence).toMatchObject({
      assignmentId: regularAssignment.id,
      planId: regular.id,
      startMinutes: 480,
    });

    const specialSchedule = await resolveEffectiveSchedule(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-08" },
      context,
    );
    expect(specialSchedule).toMatchObject({
      plan: { id: special.id, kind: "SPECIAL" },
    });
    expect(specialSchedule.occurrences[0]).toMatchObject({
      assignmentId: specialAssignment.id,
      kind: "RECOVERY",
      recovery: {
        markedForRecovery: true,
        recognition: "EXPLICIT_ACTION_REQUIRED",
      },
    });

    const repeatedSpecialSchedule = await resolveEffectiveSchedule(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-08" },
      context,
    );
    expect(repeatedSpecialSchedule.occurrences[0]?.id).toBe(
      specialSchedule.occurrences[0]?.id,
    );

    await transitionSchedulePlanStatus(
      database,
      special.id,
      { status: "INACTIVE" },
      context,
    );
    const fallbackSchedule = await resolveEffectiveSchedule(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-08" },
      context,
    );
    expect(fallbackSchedule.plan).toMatchObject({
      id: regular.id,
      kind: "REGULAR",
    });

    await updateScheduleAssignment(
      database,
      regularAssignment.id,
      {
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 540,
        endMinutes: 660,
        kind: "DUTY",
        modality: "Room 204 updated",
      },
      context,
    );
    const preservedHistory = await resolveEffectiveSchedule(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-01" },
      context,
    );
    expect(preservedHistory.occurrences[0]).toMatchObject({
      id: regularOccurrence?.id,
      assignmentId: regularAssignment.id,
      startMinutes: 480,
      endMinutes: 600,
    });

    await expect(
      listSchedulePlans(database, { cycleId: createdCycle!.id }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: regular.id, status: "ACTIVE" }),
        expect.objectContaining({ id: special.id, status: "INACTIVE" }),
      ]),
    );
    await expect(
      listScheduleAssignments(database, { planId: regular.id }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: regularAssignment.id }),
      ]),
    );

    const auditRows = getRows<{ action: string }>(
      await database.execute(sql`
        SELECT action
        FROM "audit_event"
        WHERE entity_type IN ('schedule_plan', 'schedule_assignment', 'duty_occurrence')
      `),
    );
    expect(auditRows.some((row) => row.action === "schedule_plan.created")).toBe(true);
    expect(auditRows.some((row) => row.action === "schedule_assignment.created")).toBe(true);
    expect(auditRows.some((row) => row.action === "schedule_occurrence.created")).toBe(true);
  });

  it("keeps attendance decisions explicit and links confirmed absence debits", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Attendance Engineering", normalizedName: "attendance engineering" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Attendance Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Attendance",
        lastName: "Tutor",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    const context = { actorId: admin.id };
    const plan = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Attendance 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      },
      context,
    );
    await createScheduleAssignment(
      database,
      {
        planId: plan.id,
        tutorId: createdTutor!.id,
        pattern: "DATE",
        assignmentDate: "2027-03-01",
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
      },
      context,
    );
    await createScheduleAssignment(
      database,
      {
        planId: plan.id,
        tutorId: createdTutor!.id,
        pattern: "DATE",
        assignmentDate: "2027-03-02",
        startMinutes: 600,
        endMinutes: 720,
        kind: "DUTY",
      },
      context,
    );
    const debitCategory = await createHourCategory(
      database,
      { name: "Attendance debit" },
      context,
    );

    const firstDate = await listAttendanceForDate(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-01" },
      context,
    );
    const firstOccurrence = firstDate.occurrences[0]!.occurrence;
    expect(firstDate.occurrences[0]!.attendance).toMatchObject({
      status: "PENDING",
      debitStatus: "NOT_PROPOSED",
      proposedDebitMinutes: null,
    });

    const movementCount = async () =>
      database
        .select({ id: hourMovement.id })
        .from(hourMovement)
        .where(eq(hourMovement.tutorId, createdTutor!.id));

    await expect(movementCount()).resolves.toHaveLength(0);
    const present = await setAttendanceStatus(
      database,
      firstOccurrence.id,
      { status: "PRESENT" },
      context,
    );
    expect(present).toMatchObject({
      attendance: {
        attendance: {
          status: "PRESENT",
          debitStatus: "NOT_PROPOSED",
        },
      },
      movement: null,
      reversal: null,
    });
    await expect(movementCount()).resolves.toHaveLength(0);

    const absence = await correctAttendance(
      database,
      firstOccurrence.id,
      { status: "ABSENT" },
      context,
    );
    expect(absence.attendance.attendance).toMatchObject({
      status: "ABSENT",
      debitStatus: "PROPOSED",
      proposedDebitMinutes: 120,
      recognizedDebitMinutes: null,
    });
    await expect(movementCount()).resolves.toHaveLength(0);

    const cancelled = await cancelAbsenceDebit(
      database,
      firstOccurrence.id,
      {},
      context,
    );
    expect(cancelled.attendance.attendance).toMatchObject({
      status: "ABSENT",
      debitStatus: "CANCELLED",
      proposedDebitMinutes: 120,
    });
    await expect(movementCount()).resolves.toHaveLength(0);

    const confirmed = await confirmAbsenceDebit(
      database,
      firstOccurrence.id,
      { categoryId: debitCategory.id, note: "Confirmed after cancellation" },
      context,
    );
    expect(confirmed).toMatchObject({
      attendance: {
        attendance: {
          status: "ABSENT",
          debitStatus: "CONFIRMED",
          recognizedDebitMinutes: 120,
        },
      },
      movement: {
        direction: "DEBIT",
        durationMinutes: 120,
      },
    });
    await expect(movementCount()).resolves.toHaveLength(1);
    await expect(
      confirmAbsenceDebit(
        database,
        firstOccurrence.id,
        { categoryId: debitCategory.id },
        context,
      ),
    ).rejects.toMatchObject({ code: ATTENDANCE_ERROR_CODES.debitAlreadyConfirmed });

    const correctedPresent = await correctAttendance(
      database,
      firstOccurrence.id,
      { status: "PRESENT" },
      context,
    );
    expect(correctedPresent.reversal).toMatchObject({
      original: { direction: "DEBIT", durationMinutes: 120 },
      reversal: { direction: "CREDIT", durationMinutes: 120 },
    });
    await expect(movementCount()).resolves.toHaveLength(2);

    await correctAttendance(
      database,
      firstOccurrence.id,
      { status: "ABSENT" },
      context,
    );
    const adjusted = await confirmAbsenceDebit(
      database,
      firstOccurrence.id,
      { categoryId: debitCategory.id, debitMinutes: 90 },
      context,
    );
    expect(adjusted.movement).toMatchObject({
      direction: "DEBIT",
      durationMinutes: 90,
    });
    await expect(movementCount()).resolves.toHaveLength(3);

    const linkedMovements = await database
      .select({
        id: hourMovement.id,
        direction: hourMovement.direction,
        durationMinutes: hourMovement.durationMinutes,
        reversalOfMovementId: hourMovement.reversalOfMovementId,
      })
      .from(hourMovement)
      .where(eq(hourMovement.attendanceRecordId, confirmed.attendance.attendance.id));
    expect(linkedMovements).toHaveLength(3);
    expect(linkedMovements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ direction: "DEBIT", durationMinutes: 120 }),
        expect.objectContaining({ direction: "CREDIT", durationMinutes: 120 }),
        expect.objectContaining({ direction: "DEBIT", durationMinutes: 90 }),
      ]),
    );

    const secondDate = await listAttendanceForDate(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-02" },
      context,
    );
    const secondOccurrence = secondDate.occurrences[0]!.occurrence;
    await setAttendanceStatus(
      database,
      secondOccurrence.id,
      { status: "ABSENT" },
      context,
    );
    await cancelAbsenceDebit(database, secondOccurrence.id, {}, context);
    const reopened = await reopenAbsenceDebit(
      database,
      secondOccurrence.id,
      {},
      context,
    );
    expect(reopened.attendance.attendance).toMatchObject({
      status: "ABSENT",
      debitStatus: "PROPOSED",
      proposedDebitMinutes: 120,
    });

    const attendanceEvents = getRows<{ action: string }>(
      await database.execute(sql`
        SELECT action
        FROM "audit_event"
        WHERE entity_type = 'attendance_record'
      `),
    );
    expect(attendanceEvents.map((event) => event.action)).toEqual(
      expect.arrayContaining([
        "attendance_record.created",
        "attendance_record.status_changed",
        "attendance_record.debit_cancelled",
        "attendance_record.debit_confirmed",
        "attendance_record.debit_reopened",
        "attendance_record.corrected",
      ]),
    );
  });

  it("recognizes scheduled recovery explicitly and rolls back failed attendance writes", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Recovery Engineering", normalizedName: "recovery engineering" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Recovery Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Recovery",
        lastName: "Tutor",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    const context = { actorId: admin.id };
    const regularPlan = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Recovery Duty 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      },
      context,
    );
    await createScheduleAssignment(
      database,
      {
        planId: regularPlan.id,
        tutorId: createdTutor!.id,
        pattern: "DATE",
        assignmentDate: "2027-03-04",
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
      },
      context,
    );
    const recoveryPlan = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Recovery Duties",
        kind: "SPECIAL",
        validFrom: "2027-03-03",
        validTo: "2027-03-03",
      },
      context,
    );
    await createScheduleAssignment(
      database,
      {
        planId: recoveryPlan.id,
        tutorId: createdTutor!.id,
        pattern: "DATE",
        assignmentDate: "2027-03-03",
        startMinutes: 600,
        endMinutes: 660,
        kind: "RECOVERY",
      },
      context,
    );
    const recoveryCategory = await createHourCategory(
      database,
      { name: "Scheduled recovery", activityKind: "RECOVERY" },
      context,
    );
    const debitCategory = await createHourCategory(
      database,
      { name: "Recovery rollback debit" },
      context,
    );

    const recoveryDate = await listAttendanceForDate(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-03" },
      context,
    );
    const recoveryOccurrence = recoveryDate.occurrences[0]!.occurrence;
    const recognition = await recognizeScheduledRecovery(
      database,
      recoveryOccurrence.id,
      { categoryId: recoveryCategory.id, note: "Scheduled recovery" },
      context,
    );
    expect(recognition.movement).toMatchObject({
      direction: "CREDIT",
      durationMinutes: 60,
      origin: { kind: "RECOVERY" },
    });

    const [recoveryActivity] = await database
      .select({
        id: activity.id,
        kind: activity.kind,
        dutyOccurrenceId: activity.dutyOccurrenceId,
      })
      .from(activity)
      .where(eq(activity.dutyOccurrenceId, recoveryOccurrence.id));
    expect(recoveryActivity).toEqual({
      id: expect.any(String),
      kind: "RECOVERY",
      dutyOccurrenceId: recoveryOccurrence.id,
    });
    const recoveryMovements = await database
      .select({
        id: hourMovement.id,
        activityId: hourMovement.activityId,
        attendanceRecordId: hourMovement.attendanceRecordId,
      })
      .from(hourMovement)
      .where(eq(hourMovement.activityId, recoveryActivity!.id));
    expect(recoveryMovements).toEqual([
      {
        id: expect.any(String),
        activityId: recoveryActivity!.id,
        attendanceRecordId: null,
      },
    ]);

    await setAttendanceStatus(
      database,
      recoveryOccurrence.id,
      { status: "PRESENT" },
      context,
    );
    await expect(
      database
        .select({ id: hourMovement.id })
        .from(hourMovement)
        .where(eq(hourMovement.activityId, recoveryActivity!.id)),
    ).resolves.toHaveLength(1);
    await expect(
      recognizeScheduledRecovery(
        database,
        recoveryOccurrence.id,
        { categoryId: recoveryCategory.id },
        context,
      ),
    ).rejects.toMatchObject({
      code: ATTENDANCE_ERROR_CODES.recoveryAlreadyRecognized,
    });

    const dutyDate = await listAttendanceForDate(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-04" },
      context,
    );
    const dutyOccurrence = dutyDate.occurrences[0]!.occurrence;
    await setAttendanceStatus(
      database,
      dutyOccurrence.id,
      { status: "ABSENT" },
      context,
    );
    await expect(
      confirmAbsenceDebit(
        database,
        dutyOccurrence.id,
        { categoryId: debitCategory.id },
        { ...context, requestId: "x".repeat(256) },
      ),
    ).rejects.toMatchObject({ code: ATTENDANCE_ERROR_CODES.transactionFailed });
    const [afterRollback] = await database
      .select({
        status: attendanceRecord.status,
        debitStatus: attendanceRecord.debitStatus,
        recognizedDebitMinutes: attendanceRecord.recognizedDebitMinutes,
      })
      .from(attendanceRecord)
      .where(eq(attendanceRecord.occurrenceId, dutyOccurrence.id));
    expect(afterRollback).toEqual({
      status: "ABSENT",
      debitStatus: "PROPOSED",
      recognizedDebitMinutes: null,
    });
    await expect(
      database
        .select({ id: hourMovement.id })
        .from(hourMovement)
        .where(eq(hourMovement.attendanceRecordId, dutyDate.occurrences[0]!.attendance.id)),
    ).resolves.toHaveLength(0);

    await closeAdministrativeCycle(database, createdCycle!.id, context);
    const historicalDate = await listAttendanceForDate(
      database,
      { cycleId: createdCycle!.id, date: "2027-03-04" },
      context,
    );
    expect(historicalDate).toMatchObject({
      cycle: { id: createdCycle!.id, status: "CLOSED" },
      plan: { id: regularPlan.id },
      occurrences: [
        {
          occurrence: { id: dutyOccurrence.id },
          attendance: { status: "ABSENT", debitStatus: "PROPOSED" },
        },
      ],
    });
    await expect(
      getAttendanceOccurrence(database, dutyOccurrence.id, context),
    ).resolves.toMatchObject({
      occurrence: { id: dutyOccurrence.id },
      attendance: { status: "ABSENT", debitStatus: "PROPOSED" },
    });
    await expect(
      setAttendanceStatus(
        database,
        dutyOccurrence.id,
        { status: "PRESENT" },
        context,
      ),
    ).rejects.toMatchObject({ code: ATTENDANCE_ERROR_CODES.cycleNotOpen });
  });

  it("serializes special-plan overlap and enforces assignment eligibility and conflicts", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Schedule Rules 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [activeTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Grace",
        lastName: "Hopper",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });
    const [inactiveTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Inactive",
        lastName: "Tutor",
        primaryCareerId: createdCareer!.id,
        status: "INACTIVE",
      })
      .returning({ id: tutor.id });
    const [nonMemberTutor] = await database
      .insert(tutor)
      .values({
        firstName: "No",
        lastName: "Membership",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values([
      { tutorId: activeTutor!.id, cycleId: createdCycle!.id },
      { tutorId: inactiveTutor!.id, cycleId: createdCycle!.id },
    ]);

    const context = { actorId: admin.id };
    const regular = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Regular 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      },
      context,
    );
    const firstAssignment = await createScheduleAssignment(
      database,
      {
        planId: regular.id,
        tutorId: activeTutor!.id,
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
      },
      context,
    );

    await expect(
      createScheduleAssignment(
        database,
        {
          planId: regular.id,
          tutorId: activeTutor!.id,
          pattern: "WEEKDAY",
          weekday: 1,
          startMinutes: 540,
          endMinutes: 660,
          kind: "DUTY",
        },
        context,
      ),
    ).rejects.toMatchObject({
      code: SCHEDULE_ERROR_CODES.assignmentConflict,
      details: { conflictingAssignmentIds: [firstAssignment.id] },
    });
    await expect(
      createScheduleAssignment(
        database,
        {
          planId: regular.id,
          tutorId: inactiveTutor!.id,
          pattern: "DATE",
          assignmentDate: "2027-03-02",
          startMinutes: 480,
          endMinutes: 600,
          kind: "DUTY",
        },
        context,
      ),
    ).rejects.toMatchObject({ code: SCHEDULE_ERROR_CODES.inactiveTutor });
    await expect(
      createScheduleAssignment(
        database,
        {
          planId: regular.id,
          tutorId: nonMemberTutor!.id,
          pattern: "DATE",
          assignmentDate: "2027-03-02",
          startMinutes: 480,
          endMinutes: 600,
          kind: "DUTY",
        },
        context,
      ),
    ).rejects.toMatchObject({ code: SCHEDULE_ERROR_CODES.tutorNotInCycle });
    await expect(
      createScheduleAssignment(
        database,
        {
          planId: regular.id,
          tutorId: activeTutor!.id,
          pattern: "DATE",
          assignmentDate: "2028-01-01",
          startMinutes: 480,
          endMinutes: 600,
          kind: "DUTY",
        },
        context,
      ),
    ).rejects.toMatchObject({
      code: SCHEDULE_ERROR_CODES.assignmentDateOutsidePlan,
    });

    const overlapInput = {
      cycleId: createdCycle!.id,
      name: "Special overlap",
      kind: "SPECIAL" as const,
      validFrom: "2027-04-05",
      validTo: "2027-04-09",
    };
    const concurrent = await Promise.allSettled([
      createSchedulePlan(database, overlapInput, context),
      createSchedulePlan(
        database,
        { ...overlapInput, name: "Special overlap concurrent" },
        context,
      ),
    ]);
    expect(
      concurrent.filter((result) => result.status === "fulfilled").length,
    ).toBe(1);
    const rejected = concurrent.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: { code: SCHEDULE_ERROR_CODES.specialPlanOverlap },
    });

    await database
      .update(administrativeCycle)
      .set({ status: "CLOSED", updatedAt: new Date() })
      .where(eq(administrativeCycle.id, createdCycle!.id));
    await expect(
      transitionSchedulePlanStatus(
        database,
        regular.id,
        { status: "INACTIVE" },
        context,
      ),
    ).rejects.toMatchObject({ code: SCHEDULE_ERROR_CODES.cycleNotOpen });
  });

  it("persists canonical tutor data and enforces relationship and reference constraints", async () => {
    const database = getIntegrationDatabase();
    const [primaryCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    const [secondaryCareer] = await database
      .insert(career)
      .values({ name: "Business", normalizedName: "business" })
      .returning({ id: career.id });
    const [primarySubject] = await database
      .insert(subject)
      .values({
        careerId: primaryCareer!.id,
        name: "Algorithms",
        normalizedName: "algorithms",
      })
      .returning({ id: subject.id });
    const [sameNamedSubjectInAnotherCareer] = await database
      .insert(subject)
      .values({
        careerId: secondaryCareer!.id,
        name: "Algorithms",
        normalizedName: "algorithms",
      })
      .returning({ id: subject.id });
    const [scholarship] = await database
      .insert(scholarshipReference)
      .values({
        type: "Institutional Scholarship",
        normalizedType: "institutional scholarship",
        knownRequiredHours: 120,
        notes: "Reference only",
      })
      .returning({ id: scholarshipReference.id });
    const [openCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Ada",
        lastName: "Lovelace",
        preferredDisplayName: "Ada",
        institutionalIdentifier: "LEG-001",
        normalizedInstitutionalIdentifier: "leg-001",
        primaryCareerId: primaryCareer!.id,
      })
      .returning({ id: tutor.id });

    expect(primaryCareer).toBeDefined();
    expect(secondaryCareer).toBeDefined();
    expect(primarySubject).toBeDefined();
    expect(sameNamedSubjectInAnotherCareer).toBeDefined();
    expect(scholarship).toBeDefined();
    expect(openCycle).toBeDefined();
    expect(createdTutor).toBeDefined();

    await database.insert(tutorSubject).values({
      tutorId: createdTutor!.id,
      subjectId: primarySubject!.id,
    });
    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: openCycle!.id,
      scholarshipReferenceId: scholarship!.id,
    });

    await expect(
      database
        .insert(career)
        .values({ name: " computer science ", normalizedName: "computer science" }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database
        .insert(subject)
        .values({
          careerId: primaryCareer!.id,
          name: "Algorithms",
          normalizedName: "algorithms",
        }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(scholarshipReference).values({
        type: " institutional scholarship ",
        normalizedType: "institutional scholarship",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database
        .insert(tutor)
        .values({
          firstName: "Grace",
          lastName: "Hopper",
          institutionalIdentifier: "LEG-001",
          normalizedInstitutionalIdentifier: "leg-001",
          primaryCareerId: primaryCareer!.id,
        }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(tutorSubject).values({
        tutorId: createdTutor!.id,
        subjectId: primarySubject!.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(tutorCycleMembership).values({
        tutorId: createdTutor!.id,
        cycleId: openCycle!.id,
        scholarshipReferenceId: scholarship!.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await expect(
      database.insert(scholarshipReference).values({
        type: "Invalid Scholarship",
        normalizedType: "invalid scholarship",
        knownRequiredHours: -1,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(career).values({ name: "   ", normalizedName: "" }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
    await expect(
      database.insert(tutor).values({
        firstName: "Alan",
        lastName: "Turing",
        institutionalIdentifier: "LEG-002",
        primaryCareerId: primaryCareer!.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await database
      .update(tutor)
      .set({ status: "INACTIVE" })
      .where(eq(tutor.id, createdTutor!.id));
    await database
      .update(career)
      .set({ status: "INACTIVE" })
      .where(eq(career.id, primaryCareer!.id));
    await database
      .update(subject)
      .set({ status: "INACTIVE" })
      .where(eq(subject.id, primarySubject!.id));
    await database
      .update(scholarshipReference)
      .set({ status: "INACTIVE" })
      .where(eq(scholarshipReference.id, scholarship!.id));

    await expect(
      database
        .select({ id: tutorSubject.tutorId })
        .from(tutorSubject)
        .where(eq(tutorSubject.tutorId, createdTutor!.id)),
    ).resolves.toEqual([{ id: createdTutor!.id }]);
    await expect(
      database
        .select({ tutorId: tutorCycleMembership.tutorId })
        .from(tutorCycleMembership)
        .where(eq(tutorCycleMembership.tutorId, createdTutor!.id)),
    ).resolves.toEqual([{ tutorId: createdTutor!.id }]);
    await expect(
      database
        .select({ status: tutor.status })
        .from(tutor)
        .where(eq(tutor.id, createdTutor!.id)),
    ).resolves.toEqual([{ status: "INACTIVE" }]);
  });

  it("prevents destructive deletion of referenced academic history", async () => {
    const database = getIntegrationDatabase();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Computer Science", normalizedName: "computer science" })
      .returning({ id: career.id });
    const [createdSubject] = await database
      .insert(subject)
      .values({
        careerId: createdCareer!.id,
        name: "Algorithms",
        normalizedName: "algorithms",
      })
      .returning({ id: subject.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorSubject).values({
      tutorId: createdTutor!.id,
      subjectId: createdSubject!.id,
    });
    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    await expect(
      database.delete(tutor).where(eq(tutor.id, createdTutor!.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      database.delete(subject).where(eq(subject.id, createdSubject!.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      database.delete(career).where(eq(career.id, createdCareer!.id)),
    ).rejects.toMatchObject({ cause: { code: "23503" } });

    await expect(
      database
        .select({ tutorId: tutorSubject.tutorId, subjectId: tutorSubject.subjectId })
        .from(tutorSubject),
    ).resolves.toEqual([
      { tutorId: createdTutor!.id, subjectId: createdSubject!.id },
    ]);
    await expect(
      database
        .select({ tutorId: tutorCycleMembership.tutorId, cycleId: tutorCycleMembership.cycleId })
        .from(tutorCycleMembership),
    ).resolves.toEqual([{ tutorId: createdTutor!.id, cycleId: createdCycle!.id }]);
  });

  it("runs tutor mutations transactionally and derives current coverage from canonical rows", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const auditContext = { actorId: admin.id, requestId: "tutor-service-test" };

    const createdCareer = await createCareer(
      database,
      { name: "Computer Science" },
      auditContext,
    );
    const secondaryCareer = await createCareer(
      database,
      { name: "Business" },
      auditContext,
    );
    const firstSubject = await createSubject(
      database,
      { name: "Algorithms", careerId: createdCareer.id },
      auditContext,
    );
    const secondSubject = await createSubject(
      database,
      { name: "Data Structures", careerId: createdCareer.id },
      auditContext,
    );
    const secondarySubject = await createSubject(
      database,
      { name: "Accounting", careerId: secondaryCareer.id },
      auditContext,
    );
    const scholarship = await createScholarshipReference(
      database,
      {
        type: "Institutional Scholarship",
        knownRequiredHours: 120,
        notes: "Reference only",
      },
      auditContext,
    );
    await expect(
      updateScholarshipReference(
        database,
        scholarship.id,
        { knownRequiredHours: 144, notes: "Updated reference" },
        auditContext,
      ),
    ).resolves.toMatchObject({
      id: scholarship.id,
      knownRequiredHours: 144,
      notes: "Updated reference",
    });
    const openCycle = await createAdministrativeCycle(
      database,
      {
        name: "2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      auditContext,
    );
    const [closedCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "2026",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: "CLOSED",
      })
      .returning({ id: administrativeCycle.id });

    const createdTutor = await createTutor(
      database,
      {
        firstName: " Ada ",
        lastName: " Lovelace ",
        preferredDisplayName: "Ada",
        institutionalIdentifier: "LEG-001",
        primaryCareerId: createdCareer.id,
        subjectIds: [firstSubject.id],
        cycleId: openCycle.id,
        scholarshipReferenceId: scholarship.id,
      },
      auditContext,
    );

    await expect(
      createTutor(
        database,
        {
          firstName: "Grace",
          lastName: "Hopper",
          institutionalIdentifier: " leg-001 ",
          primaryCareerId: createdCareer.id,
          cycleId: openCycle.id,
        },
        auditContext,
      ),
    ).rejects.toMatchObject({
      code: TUTOR_ERROR_CODES.duplicateInstitutionalIdentifier,
    });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor.id,
      cycleId: closedCycle!.id,
    });

    expect(createdTutor).toMatchObject({
      formalName: "Lovelace, Ada",
      currentCycle: { id: openCycle.id, name: "2027", status: "OPEN" },
      currentCycleLabel: "2027",
      scholarshipReference: { id: scholarship.id, type: "Institutional Scholarship" },
      subjects: [{ id: firstSubject.id, careerId: createdCareer.id }],
      memberships: [{ cycle: { id: openCycle.id } }],
    });

    const updatedTutor = await updateTutor(
      database,
      createdTutor.id,
      {
        subjectIds: [secondSubject.id],
        cycleId: openCycle.id,
        scholarshipReferenceId: null,
      },
      auditContext,
    );

    expect(updatedTutor).toMatchObject({
      scholarshipReference: null,
      subjects: [{ id: secondSubject.id }],
    });
    expect(updatedTutor.memberships.map((membership) => membership.cycle.id)).toEqual([
      openCycle.id,
      closedCycle!.id,
    ]);
    expect(
      updatedTutor.memberships.find(
        (membership) => membership.cycle.id === closedCycle!.id,
      ),
    ).toMatchObject({ cycle: { status: "CLOSED" }, scholarshipReference: null });

    await expect(
      createTutor(
        database,
        {
          firstName: "Grace",
          lastName: "Hopper",
          primaryCareerId: createdCareer.id,
          subjectIds: [secondarySubject.id],
          cycleId: openCycle.id,
        },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.careerSubjectMismatch });
    await expect(
      createTutor(
        database,
        {
          firstName: "Katherine",
          lastName: "Johnson",
          primaryCareerId: createdCareer.id,
          cycleId: closedCycle!.id,
        },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.cycleNotOpen });

    const tutorList = await listTutors(database, {
      search: "ada",
      status: "ACTIVE",
      limit: 25,
      offset: 0,
    });
    expect(tutorList).toHaveLength(1);
    expect(tutorList[0]).toMatchObject({
      id: createdTutor.id,
      formalName: "Lovelace, Ada",
      subjectCount: 1,
      currentCycleLabel: "2027",
    });

    const catalogOptions = await getActiveCatalogOptions(database);
    expect(catalogOptions).toMatchObject({
      currentCycle: { id: openCycle.id },
      careers: expect.arrayContaining([
        expect.objectContaining({ id: createdCareer.id, status: "ACTIVE" }),
      ]),
      scholarshipReferences: expect.arrayContaining([
        expect.objectContaining({ id: scholarship.id, status: "ACTIVE" }),
      ]),
    });

    const activeCoverage = await listSubjectCoverage(database);
    expect(activeCoverage).toMatchObject({
      currentCycle: { id: openCycle.id },
      subjects: [
        {
          subject: { id: secondSubject.id, name: "Data Structures" },
          tutors: [{ id: createdTutor.id, formalName: "Lovelace, Ada" }],
        },
      ],
    });
    expect(activeCoverage).not.toHaveProperty("plannedHours");
    expect(activeCoverage.subjects[0]?.tutors[0]).not.toHaveProperty("plannedHours");

    const inactiveTutor = await transitionTutorStatus(
      database,
      createdTutor.id,
      { status: "INACTIVE" },
      auditContext,
    );
    expect(inactiveTutor.status).toBe("INACTIVE");
    await expect(
      transitionTutorStatus(
        database,
        createdTutor.id,
        { status: "INACTIVE" },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.statusAlreadySet });
    await expect(listSubjectCoverage(database)).resolves.toMatchObject({
      currentCycle: { id: openCycle.id },
      subjects: [],
    });

    const reactivatedTutor = await transitionTutorStatus(
      database,
      createdTutor.id,
      { status: "ACTIVE" },
      auditContext,
    );
    expect(reactivatedTutor.status).toBe("ACTIVE");
    const reactivatedCoverage = await listSubjectCoverage(database);
    expect(reactivatedCoverage.subjects).toHaveLength(1);
    expect(reactivatedCoverage.subjects[0]?.subject.id).toBe(secondSubject.id);
    expect(reactivatedCoverage.subjects[0]?.tutors).toEqual([
      expect.objectContaining({ id: createdTutor.id }),
    ]);

    const inactiveSubjectRecord = await transitionSubjectStatus(
      database,
      secondSubject.id,
      { status: "INACTIVE" },
      auditContext,
    );
    expect(inactiveSubjectRecord.status).toBe("INACTIVE");
    await expect(
      database
        .select({ subjectId: tutorSubject.subjectId })
        .from(tutorSubject)
        .where(eq(tutorSubject.subjectId, secondSubject.id)),
    ).resolves.toEqual([{ subjectId: secondSubject.id }]);
    await expect(
      createTutor(
        database,
        {
          firstName: "Katherine",
          lastName: "Johnson",
          primaryCareerId: createdCareer.id,
          subjectIds: [secondSubject.id],
          cycleId: openCycle.id,
        },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.inactiveSubject });
    await expect(
      transitionSubjectStatus(
        database,
        secondSubject.id,
        { status: "ACTIVE" },
        auditContext,
      ),
    ).resolves.toMatchObject({ id: secondSubject.id, status: "ACTIVE" });

    await transitionCareerStatus(
      database,
      secondaryCareer.id,
      { status: "INACTIVE" },
      auditContext,
    );
    await expect(
      createSubject(
        database,
        { name: "Inactive Career Subject", careerId: secondaryCareer.id },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.inactiveCareer });
    await expect(
      transitionCareerStatus(
        database,
        secondaryCareer.id,
        { status: "ACTIVE" },
        auditContext,
      ),
    ).resolves.toMatchObject({ id: secondaryCareer.id, status: "ACTIVE" });

    await transitionScholarshipReferenceStatus(
      database,
      scholarship.id,
      { status: "INACTIVE" },
      auditContext,
    );
    await expect(
      createTutor(
        database,
        {
          firstName: "Katherine",
          lastName: "Johnson",
          primaryCareerId: createdCareer.id,
          cycleId: openCycle.id,
          scholarshipReferenceId: scholarship.id,
        },
        auditContext,
      ),
    ).rejects.toMatchObject({
      code: TUTOR_ERROR_CODES.inactiveScholarshipReference,
    });
    await expect(
      transitionScholarshipReferenceStatus(
        database,
        scholarship.id,
        { status: "ACTIVE" },
        auditContext,
      ),
    ).resolves.toMatchObject({
      id: scholarship.id,
      status: "ACTIVE",
    });

    const tutorEvents = (await listAuditEvents(database, 100)).filter(
      (event) => event.entityId === createdTutor.id,
    );
    expect(tutorEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: admin.id,
          action: "tutor.created",
          entityType: "tutor",
          metadata: expect.objectContaining({
            primaryCareerId: createdCareer.id,
            cycleId: openCycle.id,
            subjectIds: [firstSubject.id],
          }),
        }),
        expect.objectContaining({
          action: "tutor.updated",
          metadata: expect.objectContaining({
            addedSubjectIds: [secondSubject.id],
            removedSubjectIds: [firstSubject.id],
            cycleId: openCycle.id,
            scholarshipReferenceId: null,
          }),
        }),
        expect.objectContaining({
          action: "tutor.status_changed",
          metadata: { previousStatus: "ACTIVE", status: "INACTIVE" },
        }),
      ]),
    );
    expect(JSON.stringify(tutorEvents)).not.toContain("password");
    expect(JSON.stringify(tutorEvents)).not.toContain("token");

    await closeAdministrativeCycle(database, openCycle.id, auditContext);
    await expect(listSubjectCoverage(database)).resolves.toEqual({
      currentCycle: null,
      subjects: [],
    });
  });

  it("enforces one-to-one Tutor account ownership without deleting Tutor history", async () => {
    const database = getIntegrationDatabase();
    const { admin, tutor: tutorIdentity, disabled } = await seedIdentities();
    const replacementIdentity = await provisionUser(
      database,
      {
        email: "replacement.integration@example.test",
        name: "Replacement Tutor",
        role: "TUTOR",
        enabled: true,
      },
      { actorId: admin.id, source: "admin" },
    );
    const careerRecord = await createCareer(
      database,
      { name: "Account Ownership Engineering" },
      { actorId: admin.id },
    );
    const cycle = await createAdministrativeCycle(
      database,
      {
        name: "Account Ownership Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      { actorId: admin.id },
    );
    const auditContext = { actorId: admin.id, requestId: "account-ownership-test" };

    const linkedTutor = await createTutor(
      database,
      {
        firstName: "Ada",
        lastName: "Lovelace",
        primaryCareerId: careerRecord.id,
        cycleId: cycle.id,
        applicationEmail: ` ${tutorIdentity.email.toUpperCase()} `,
      },
      auditContext,
    );

    expect(linkedTutor.applicationAccount).toEqual({
      email: tutorIdentity.email,
      enabled: true,
    });
    await expect(
      database
        .select({ applicationUserId: tutor.applicationUserId })
        .from(tutor)
        .where(eq(tutor.id, linkedTutor.id)),
    ).resolves.toEqual([{ applicationUserId: tutorIdentity.id }]);

    await expect(
      createTutor(
        database,
        {
          firstName: "Grace",
          lastName: "Hopper",
          primaryCareerId: careerRecord.id,
          cycleId: cycle.id,
          applicationEmail: tutorIdentity.email,
        },
        auditContext,
      ),
    ).rejects.toMatchObject({
      code: TUTOR_ERROR_CODES.applicationAccountAlreadyLinked,
    });
    await expect(
      database.insert(tutor).values({
        firstName: "Invalid",
        lastName: "Foreign Key",
        primaryCareerId: careerRecord.id,
        applicationUserId: "missing-application-user",
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });
    await expect(
      database.insert(tutor).values({
        firstName: "Duplicate",
        lastName: "Application Account",
        primaryCareerId: careerRecord.id,
        applicationUserId: tutorIdentity.id,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });

    await expect(
      updateTutor(
        database,
        linkedTutor.id,
        { applicationEmail: "unknown.integration@example.test" },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.applicationAccountNotFound });
    await expect(
      updateTutor(
        database,
        linkedTutor.id,
        { applicationEmail: admin.email },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.applicationAccountNotTutor });
    await expect(
      updateTutor(
        database,
        linkedTutor.id,
        { applicationEmail: disabled.email },
        auditContext,
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.applicationAccountDisabled });

    await database.delete(user).where(eq(user.id, tutorIdentity.id));

    await expect(getTutorDetail(database, linkedTutor.id)).resolves.toMatchObject({
      id: linkedTutor.id,
      applicationAccount: null,
      memberships: [{ cycle: { id: cycle.id } }],
    });

    authMocks.getSession.mockResolvedValue(null);
    const unauthorizedLink = await patchAdminTutorDetail(
      makeJsonRequest(
        `http://localhost/api/admin/tutors/${linkedTutor.id}`,
        "PATCH",
        { applicationEmail: replacementIdentity.email },
      ),
      { params: Promise.resolve({ tutorId: linkedTutor.id }) },
    );
    expect(unauthorizedLink.status).toBe(401);

    authMocks.getSession.mockResolvedValue({
      user: { id: replacementIdentity.id, role: "TUTOR" },
    });
    const forbiddenLink = await patchAdminTutorDetail(
      makeJsonRequest(
        `http://localhost/api/admin/tutors/${linkedTutor.id}`,
        "PATCH",
        { applicationEmail: replacementIdentity.email },
      ),
      { params: Promise.resolve({ tutorId: linkedTutor.id }) },
    );
    expect(forbiddenLink.status).toBe(403);

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "ADMIN" },
    });
    const authorizedLink = await patchAdminTutorDetail(
      makeJsonRequest(
        `http://localhost/api/admin/tutors/${linkedTutor.id}`,
        "PATCH",
        { applicationEmail: ` ${replacementIdentity.email.toUpperCase()} ` },
      ),
      { params: Promise.resolve({ tutorId: linkedTutor.id }) },
    );
    expect(authorizedLink.status).toBe(200);
    await expect(authorizedLink.json()).resolves.toMatchObject({
      tutor: {
        id: linkedTutor.id,
        applicationAccount: {
          email: replacementIdentity.email,
          enabled: true,
        },
      },
    });

    const clearedTutor = await updateTutor(
      database,
      linkedTutor.id,
      { applicationEmail: null },
      auditContext,
    );
    expect(clearedTutor.applicationAccount).toBeNull();
    await expect(
      database
        .select({ applicationUserId: tutor.applicationUserId })
        .from(tutor)
        .where(eq(tutor.id, linkedTutor.id)),
    ).resolves.toEqual([{ applicationUserId: null }]);
    await expect(
      database
        .select({ tutorId: tutorCycleMembership.tutorId })
        .from(tutorCycleMembership)
        .where(eq(tutorCycleMembership.tutorId, linkedTutor.id)),
    ).resolves.toEqual([{ tutorId: linkedTutor.id }]);

    const accountEvents = (await listAuditEvents(database, 100)).filter(
      (event) => event.entityId === linkedTutor.id,
    );
    expect(accountEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: admin.id,
          action: "tutor.application_account_linked",
          metadata: { applicationUserId: tutorIdentity.id },
        }),
        expect.objectContaining({
          actorId: admin.id,
          action: "tutor.application_account_linked",
          metadata: { applicationUserId: replacementIdentity.id },
        }),
        expect.objectContaining({
          actorId: admin.id,
          action: "tutor.application_account_unlinked",
          metadata: { applicationUserId: replacementIdentity.id },
        }),
      ]),
    );
    expect(JSON.stringify(accountEvents)).not.toContain(tutorIdentity.email);
    expect(JSON.stringify(accountEvents)).not.toContain(replacementIdentity.email);
    expect(JSON.stringify(accountEvents)).not.toContain("token");
    expect(JSON.stringify(accountEvents)).not.toContain("password");
  });

  it("rolls back a tutor write when its audit event cannot be recorded", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const careerRecord = await createCareer(
      database,
      { name: "Computer Science" },
      { actorId: admin.id },
    );
    const cycle = await createAdministrativeCycle(
      database,
      {
        name: "2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      { actorId: admin.id },
    );

    await expect(
      createTutor(
        database,
        {
          firstName: "Grace",
          lastName: "Hopper",
          institutionalIdentifier: "LEG-ROLLBACK",
          primaryCareerId: careerRecord.id,
          cycleId: cycle.id,
        },
        { actorId: admin.id, requestId: "x".repeat(256) },
      ),
    ).rejects.toMatchObject({ code: TUTOR_ERROR_CODES.transactionFailed });

    await expect(
      database
        .select({ id: tutor.id })
        .from(tutor)
        .where(eq(tutor.institutionalIdentifier, "LEG-ROLLBACK")),
    ).resolves.toEqual([]);
    await expect(
      database
        .select({ id: auditEvent.id })
        .from(auditEvent)
        .where(eq(auditEvent.entityType, "tutor")),
    ).resolves.toEqual([]);
  });

  it("enforces date, open-cycle, foreign-key, cascade, and audit actor constraints", async () => {
    const database = getIntegrationDatabase();

    await expect(
      database.insert(administrativeCycle).values({
        name: "Invalid cycle",
        startDate: "2027-12-31",
        endDate: "2027-01-01",
        status: "OPEN",
      }),
    ).rejects.toMatchObject({ cause: { code: "23514" } });

    await database.insert(administrativeCycle).values({
      name: "Open cycle",
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      status: "OPEN",
    });
    await expect(
      database.insert(administrativeCycle).values({
        name: "Second open cycle",
        startDate: "2028-01-01",
        endDate: "2028-12-31",
        status: "OPEN",
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    await database.insert(administrativeCycle).values({
      name: "Closed cycle",
      startDate: "2028-01-01",
      endDate: "2028-12-31",
      status: "CLOSED",
    });

    await expect(
      database.insert(session).values({
        id: "orphan-session",
        token: "orphan-session-token",
        userId: "missing-user",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      }),
    ).rejects.toMatchObject({ cause: { code: "23503" } });

    const relationshipUserId = "relationship-user";
    await database.insert(user).values({
      id: relationshipUserId,
      name: "Relationship User",
      email: "relationship@example.test",
      emailVerified: true,
      role: "ADMIN",
      enabled: true,
    });
    await database.insert(session).values({
      id: "relationship-session",
      token: "relationship-session-token",
      userId: relationshipUserId,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    await database.insert(account).values({
      id: "relationship-account",
      accountId: "relationship-account-id",
      providerId: "google",
      userId: relationshipUserId,
    });
    await database.insert(auditEvent).values({
      actorId: relationshipUserId,
      action: "relationship.test",
      entityType: "user",
      entityId: relationshipUserId,
      metadata: {},
    });

    await database.delete(user).where(eq(user.id, relationshipUserId));

    await expect(
      database
        .select({ id: session.id })
        .from(session)
        .where(eq(session.id, "relationship-session")),
    ).resolves.toEqual([]);
    await expect(
      database
        .select({ id: account.id })
        .from(account)
        .where(eq(account.id, "relationship-account")),
    ).resolves.toEqual([]);
    await expect(
      database
        .select({ actorId: auditEvent.actorId })
        .from(auditEvent)
        .where(eq(auditEvent.action, "relationship.test")),
    ).resolves.toEqual([{ actorId: null }]);
  });

  it("persists provisioned roles and applies Google and session gates to real rows", async () => {
    const database = getIntegrationDatabase();
    const { admin, disabled } = await seedIdentities();
    const options = createAuthOptions(authEnvironment, database);
    const google = options.socialProviders?.google;
    const validateUserInfo = options.user?.validateUserInfo;
    const sessionBefore = options.databaseHooks?.session?.create?.before;

    expect(google).toMatchObject({
      disableImplicitSignUp: true,
      disableSignUp: true,
    });
    expect(options.emailAndPassword).toMatchObject({
      enabled: false,
      disableSignUp: true,
    });

    const unknownResult = await validateUserInfo?.({
      user: { email: "unknown.integration@example.test" },
      source: {
        action: "create-user",
        method: "oauth",
        oauth: { providerId: "google" },
      },
    } as never);
    const disabledResult = await validateUserInfo?.({
      user: { email: disabled.email },
      source: {
        action: "create-user",
        method: "oauth",
        oauth: { providerId: "google" },
      },
    } as never);
    const enabledResult = await validateUserInfo?.({
      user: { email: admin.email },
      source: {
        action: "create-user",
        method: "oauth",
        oauth: { providerId: "google" },
      },
    } as never);

    expect(unknownResult?.error).toBe("identity_not_provisioned");
    expect(disabledResult?.error).toBe("identity_not_provisioned");
    expect(enabledResult).toBeUndefined();
    await expect(sessionBefore?.({ userId: admin.id } as never)).resolves.toBe(true);
    await expect(sessionBefore?.({ userId: disabled.id } as never)).resolves.toBe(false);

    const persistedUsers = await database
      .select({ email: user.email, role: user.role, enabled: user.enabled })
      .from(user)
      .orderBy(user.email);
    expect(persistedUsers).toEqual([
      { email: "admin.integration@example.test", role: "ADMIN", enabled: true },
      { email: "disabled.integration@example.test", role: "TUTOR", enabled: false },
      { email: "tutor.integration@example.test", role: "TUTOR", enabled: true },
    ]);
  });

  it("records a post-creation session audit with no credential metadata", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const options = createAuthOptions(authEnvironment, database);
    const sessionId = "integration-session";

    await database.insert(session).values({
      id: sessionId,
      token: "integration-session-token",
      userId: admin.id,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    await options.databaseHooks?.session?.create?.after?.({
      id: sessionId,
      userId: admin.id,
    } as never);

    const [event] = await database
      .select({
        actorId: auditEvent.actorId,
        action: auditEvent.action,
        entityType: auditEvent.entityType,
        entityId: auditEvent.entityId,
        metadata: auditEvent.metadata,
        createdAt: auditEvent.createdAt,
      })
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.action, "session.created"),
          eq(auditEvent.entityId, sessionId),
        ),
      )
      .limit(1);

    expect(event).toMatchObject({
      actorId: admin.id,
      action: "session.created",
      entityType: "session",
      entityId: sessionId,
      metadata: {},
    });
    expect(event?.createdAt).toBeInstanceOf(Date);
    expect(JSON.stringify(event?.metadata)).not.toContain("integration-session-token");
  });

  it("enforces DB-backed page and API role authorization", async () => {
    const { admin, tutor } = await seedIdentities();

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "TUTOR" },
    });
    await expect(requireRole("ADMIN")).resolves.toMatchObject({
      id: admin.id,
      role: "ADMIN",
    });
    const adminResponse = await getAdminCycles();
    expect(adminResponse.status).toBe(200);

    authMocks.getSession.mockResolvedValue({
      user: { id: tutor.id, role: "ADMIN" },
    });
    await expect(requireRole("TUTOR")).resolves.toMatchObject({
      id: tutor.id,
      role: "TUTOR",
    });
    await expect(requireRole("ADMIN")).rejects.toThrow("redirect:/forbidden");

    const tutorApiResponse = await requireApiRole("ADMIN");
    expect(tutorApiResponse).toBeInstanceOf(Response);
    expect(tutorApiResponse).toHaveProperty("status", 403);
    await expect((tutorApiResponse as Response).json()).resolves.toEqual({
      error: "forbidden",
    });
    const tutorCycleResponse = await getAdminCycles();
    expect(tutorCycleResponse.status).toBe(403);
  });

  it("serves real schedule and attendance DTOs only through the Admin boundary", async () => {
    const database = getIntegrationDatabase();
    const { admin, tutor: tutorIdentity } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Route Engineering", normalizedName: "route engineering" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Route Schedule Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Route",
        lastName: "Tutor",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle!.id,
    });

    const context = { actorId: admin.id };
    const plan = await createSchedulePlan(
      database,
      {
        cycleId: createdCycle!.id,
        name: "Route Regular 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      },
      context,
    );
    await createScheduleAssignment(
      database,
      {
        planId: plan.id,
        tutorId: createdTutor!.id,
        pattern: "DATE",
        assignmentDate: "2027-04-05",
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
        modality: "Route room",
      },
      context,
    );

    authMocks.getSession.mockResolvedValue(null);
    const unauthenticatedSchedule = await getAdminScheduleWorkspace(
      new Request(
        `http://localhost/api/admin/schedules?cycleId=${createdCycle!.id}&date=2027-04-05`,
      ),
    );
    expect(unauthenticatedSchedule.status).toBe(401);

    authMocks.getSession.mockResolvedValue({
      user: { id: tutorIdentity.id, role: "ADMIN" },
    });
    const forbiddenAttendance = await getAdminAttendanceCollection(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=${createdCycle!.id}&date=2027-04-05`,
      ),
    );
    expect(forbiddenAttendance.status).toBe(403);

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "ADMIN" },
    });
    const scheduleResponse = await getAdminScheduleWorkspace(
      new Request(
        `http://localhost/api/admin/schedules?cycleId=${createdCycle!.id}&date=2027-04-05`,
      ),
    );
    expect(scheduleResponse.status).toBe(200);
    const scheduleBody = (await scheduleResponse.json()) as {
      currentCycle: { id: string };
      selectedPlan: { id: string };
      assignments: Array<{ tutorName: string }>;
      effective: { occurrences: Array<{ id: string }> };
    };
    expect(scheduleBody).toMatchObject({
      currentCycle: { id: createdCycle!.id },
      selectedPlan: { id: plan.id },
      assignments: [expect.objectContaining({ tutorName: "Tutor, Route" })],
    });
    expect(scheduleBody.effective.occurrences).toHaveLength(1);
    expect(JSON.stringify(scheduleBody)).not.toContain("admin.integration");

    const attendanceResponse = await getAdminAttendanceCollection(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=${createdCycle!.id}&date=2027-04-05`,
      ),
    );
    expect(attendanceResponse.status).toBe(200);
    const attendanceBody = (await attendanceResponse.json()) as {
      occurrences: Array<{
        occurrence: { id: string };
        tutor: { formalName: string };
        attendance: { status: string; debitStatus: string };
      }>;
    };
    expect(attendanceBody).toMatchObject({
      date: "2027-04-05",
      occurrences: [
        {
          tutor: { formalName: "Tutor, Route" },
          attendance: { status: "PENDING", debitStatus: "NOT_PROPOSED" },
        },
      ],
    });
    expect(JSON.stringify(attendanceBody)).not.toContain("admin.integration");

    const occurrenceId = attendanceBody.occurrences[0]!.occurrence.id;
    const occurrenceResponse = await getAdminAttendanceOccurrence(
      new Request(
        `http://localhost/api/admin/schedules/attendance/${occurrenceId}`,
      ),
      { params: Promise.resolve({ occurrenceId }) },
    );
    expect(occurrenceResponse.status).toBe(200);

    const presentResponse = await postAdminAttendance(
      makeJsonRequest(
        `http://localhost/api/admin/schedules/attendance/${occurrenceId}`,
        "POST",
        { operation: "PRESENT" },
      ),
      { params: Promise.resolve({ occurrenceId }) },
    );
    expect(presentResponse.status).toBe(200);
    await expect(presentResponse.json()).resolves.toMatchObject({
      attendance: {
        attendance: { status: "PRESENT", debitStatus: "NOT_PROPOSED" },
      },
      movement: null,
    });
  });

  it("enforces Admin authorization on tutor and catalog route handlers", async () => {
    const { admin, tutor } = await seedIdentities();

    authMocks.getSession.mockResolvedValue(null);
    const unauthenticatedResponse = await getAdminTutorCollection(
      new Request("http://localhost/api/admin/tutors"),
    );
    expect(unauthenticatedResponse.status).toBe(401);

    authMocks.getSession.mockResolvedValue({
      user: { id: tutor.id, role: "ADMIN" },
    });
    const tutorListResponse = await getAdminTutorCollection(
      new Request("http://localhost/api/admin/tutors"),
    );
    const tutorReferenceMutationResponse = await postAdminCareers(
      new Request("http://localhost/api/admin/settings/careers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Denied Career" }),
      }),
    );
    expect(tutorListResponse.status).toBe(403);
    expect(tutorReferenceMutationResponse.status).toBe(403);

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "TUTOR" },
    });
    const adminListResponse = await getAdminTutorCollection(
      new Request("http://localhost/api/admin/tutors"),
    );
    const adminReferenceMutationResponse = await postAdminCareers(
      new Request("http://localhost/api/admin/settings/careers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Integration Career" }),
      }),
    );
    expect(adminListResponse.status).toBe(200);
    expect(adminReferenceMutationResponse.status).toBe(201);
  });

  it("protects every tutor and academic API boundary and the Admin page shell", async () => {
    const { admin, tutor } = await seedIdentities();
    const routeId = "77777777-7777-4777-8777-777777777777";
    const routeContext = {
      params: Promise.resolve({ tutorId: routeId }),
    };
    const careerContext = {
      params: Promise.resolve({ careerId: routeId }),
    };
    const subjectContext = {
      params: Promise.resolve({ subjectId: routeId }),
    };
    const scholarshipContext = {
      params: Promise.resolve({ scholarshipReferenceId: routeId }),
    };
    const apiBoundaries = [
      {
        name: "tutor collection GET",
        invoke: () =>
          getAdminTutorCollection(
            makeJsonRequest("http://localhost/api/admin/tutors"),
          ),
      },
      {
        name: "tutor collection POST",
        invoke: () =>
          postAdminTutorCollection(
            makeJsonRequest("http://localhost/api/admin/tutors", "POST", {}),
          ),
      },
      {
        name: "tutor detail GET",
        invoke: () =>
          getAdminTutorDetail(
            makeJsonRequest("http://localhost/api/admin/tutors/detail"),
            routeContext,
          ),
      },
      {
        name: "tutor detail PATCH",
        invoke: () =>
          patchAdminTutorDetail(
            makeJsonRequest("http://localhost/api/admin/tutors/detail", "PATCH", {}),
            routeContext,
          ),
      },
      {
        name: "tutor status PATCH",
        invoke: () =>
          patchAdminTutorStatus(
            makeJsonRequest("http://localhost/api/admin/tutors/status", "PATCH", {}),
            routeContext,
          ),
      },
      {
        name: "subject coverage GET",
        invoke: () => getAdminTutorSubjects(),
      },
      {
        name: "career collection GET",
        invoke: () =>
          getAdminCareers(makeJsonRequest("http://localhost/api/admin/settings/careers")),
      },
      {
        name: "career collection POST",
        invoke: () =>
          postAdminCareers(
            makeJsonRequest("http://localhost/api/admin/settings/careers", "POST", {}),
          ),
      },
      {
        name: "career detail GET",
        invoke: () =>
          getAdminCareerDetail(
            makeJsonRequest("http://localhost/api/admin/settings/careers/detail"),
            careerContext,
          ),
      },
      {
        name: "career detail PATCH",
        invoke: () =>
          patchAdminCareerDetail(
            makeJsonRequest("http://localhost/api/admin/settings/careers/detail", "PATCH", {}),
            careerContext,
          ),
      },
      {
        name: "career status PATCH",
        invoke: () =>
          patchAdminCareerStatus(
            makeJsonRequest("http://localhost/api/admin/settings/careers/status", "PATCH", {}),
            careerContext,
          ),
      },
      {
        name: "subject collection GET",
        invoke: () =>
          getAdminSubjects(makeJsonRequest("http://localhost/api/admin/settings/subjects")),
      },
      {
        name: "subject collection POST",
        invoke: () =>
          postAdminSubjects(
            makeJsonRequest("http://localhost/api/admin/settings/subjects", "POST", {}),
          ),
      },
      {
        name: "subject detail GET",
        invoke: () =>
          getAdminSubjectDetail(
            makeJsonRequest("http://localhost/api/admin/settings/subjects/detail"),
            subjectContext,
          ),
      },
      {
        name: "subject detail PATCH",
        invoke: () =>
          patchAdminSubjectDetail(
            makeJsonRequest("http://localhost/api/admin/settings/subjects/detail", "PATCH", {}),
            subjectContext,
          ),
      },
      {
        name: "subject status PATCH",
        invoke: () =>
          patchAdminSubjectStatus(
            makeJsonRequest("http://localhost/api/admin/settings/subjects/status", "PATCH", {}),
            subjectContext,
          ),
      },
      {
        name: "scholarship collection GET",
        invoke: () =>
          getAdminScholarships(
            makeJsonRequest("http://localhost/api/admin/settings/scholarship-references"),
          ),
      },
      {
        name: "scholarship collection POST",
        invoke: () =>
          postAdminScholarships(
            makeJsonRequest(
              "http://localhost/api/admin/settings/scholarship-references",
              "POST",
              {},
            ),
          ),
      },
      {
        name: "scholarship detail GET",
        invoke: () =>
          getAdminScholarshipDetail(
            makeJsonRequest(
              "http://localhost/api/admin/settings/scholarship-references/detail",
            ),
            scholarshipContext,
          ),
      },
      {
        name: "scholarship detail PATCH",
        invoke: () =>
          patchAdminScholarshipDetail(
            makeJsonRequest(
              "http://localhost/api/admin/settings/scholarship-references/detail",
              "PATCH",
              {},
            ),
            scholarshipContext,
          ),
      },
      {
        name: "scholarship status PATCH",
        invoke: () =>
          patchAdminScholarshipStatus(
            makeJsonRequest(
              "http://localhost/api/admin/settings/scholarship-references/status",
              "PATCH",
              {},
            ),
            scholarshipContext,
          ),
      },
    ];

    authMocks.getSession.mockResolvedValue({
      user: { id: tutor.id, role: "ADMIN" },
    });

    for (const boundary of apiBoundaries) {
      await expect(boundary.invoke(), boundary.name).resolves.toMatchObject({
        status: 403,
      });
    }

    await expect(AdminLayout({ children: null })).rejects.toThrow(
      "redirect:/forbidden",
    );

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "TUTOR" },
    });

    for (const boundary of apiBoundaries) {
      const response = await boundary.invoke();
      expect(response.status, boundary.name).not.toBe(401);
      expect(response.status, boundary.name).not.toBe(403);
    }

    await expect(AdminLayout({ children: null })).resolves.toBeDefined();
  });

  it("reconstructs hour balances and preserves activity, recovery, and reversal history", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Systems Engineering", normalizedName: "systems engineering" })
      .returning({ id: career.id });
    const [createdCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Hour Service Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
        status: "OPEN",
      })
      .returning({ id: administrativeCycle.id });
    const domainTutors = await database
      .insert(tutor)
      .values([
        {
          firstName: "Ada",
          lastName: "Lovelace",
          primaryCareerId: createdCareer!.id,
        },
        {
          firstName: "Grace",
          lastName: "Hopper",
          primaryCareerId: createdCareer!.id,
        },
      ])
      .returning({ id: tutor.id });
    const [inactiveTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Inactive",
        lastName: "Tutor",
        primaryCareerId: createdCareer!.id,
        status: "INACTIVE",
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values(
      [...domainTutors, inactiveTutor!].map((domainTutor) => ({
        tutorId: domainTutor.id,
        cycleId: createdCycle!.id,
      })),
    );

    const meetingCategory = await createHourCategory(
      database,
      { name: "Team meeting", activityKind: "MEETING" },
      { actorId: admin.id, requestId: "category-meeting" },
    );
    const recoveryCategory = await createHourCategory(
      database,
      { name: "Recovery", activityKind: "RECOVERY" },
      { actorId: admin.id, requestId: "category-recovery" },
    );
    const workshopCategory = await createHourCategory(
      database,
      { name: "Workshop", activityKind: "WORKSHOP" },
      { actorId: admin.id, requestId: "category-workshop" },
    );
    const extraordinaryCategory = await createHourCategory(
      database,
      { name: "Extraordinary", activityKind: "EXTRAORDINARY" },
      { actorId: admin.id, requestId: "category-extraordinary" },
    );
    const manualCategory = await createHourCategory(
      database,
      { name: "Manual adjustment" },
      { actorId: admin.id, requestId: "category-manual" },
    );

    const workspace = await getHourWorkspace(database);
    expect(workspace).toMatchObject({
      currentCycle: { id: createdCycle!.id, status: "OPEN" },
      categories: expect.arrayContaining([
        expect.objectContaining({ id: meetingCategory.id, activityKind: "MEETING" }),
        expect.objectContaining({ id: recoveryCategory.id, activityKind: "RECOVERY" }),
        expect.objectContaining({ id: workshopCategory.id, activityKind: "WORKSHOP" }),
        expect.objectContaining({ id: extraordinaryCategory.id, activityKind: "EXTRAORDINARY" }),
        expect.objectContaining({ id: manualCategory.id, activityKind: null }),
      ]),
    });
    expect(workspace.eligibleTutors).toHaveLength(2);
    expect(workspace.eligibleTutors.map((eligibleTutor) => eligibleTutor.id)).not.toContain(
      inactiveTutor!.id,
    );

    const bulk = await recordBulkHourMovement(
      database,
      {
        cycleId: createdCycle!.id,
        tutorIds: domainTutors.map((domainTutor) => domainTutor.id),
        categoryId: meetingCategory.id,
        direction: "CREDIT",
        duration: { hours: 1, minutes: 30 },
        movementDate: "2027-02-15",
        note: "Weekly coordination",
      },
      {
        actorId: admin.id,
        requestId: "bulk-meeting",
        ipAddress: "203.0.113.40",
      },
    );

    expect(bulk.movements).toHaveLength(2);
    expect(bulk.origin).toMatchObject({
      kind: "MEETING",
      durationMinutes: 90,
      actor: { id: admin.id, displayName: "Integration Admin" },
    });

    const workshop = await recordBulkHourMovement(
      database,
      {
        cycleId: createdCycle!.id,
        tutorIds: [domainTutors[1]!.id],
        categoryId: workshopCategory.id,
        direction: "CREDIT",
        duration: { durationMinutes: 45 },
        movementDate: "2027-02-15",
        note: "Workshop activity credit",
      },
      { actorId: admin.id, requestId: "bulk-workshop" },
    );
    expect(workshop.origin).toMatchObject({
      kind: "WORKSHOP",
      durationMinutes: 45,
    });

    const extraordinary = await recordBulkHourMovement(
      database,
      {
        cycleId: createdCycle!.id,
        tutorIds: [domainTutors[0]!.id],
        categoryId: extraordinaryCategory.id,
        direction: "CREDIT",
        duration: { durationMinutes: 20 },
        movementDate: "2027-02-16",
        note: "Extraordinary activity credit",
      },
      { actorId: admin.id, requestId: "bulk-extraordinary" },
    );
    expect(extraordinary.origin).toMatchObject({
      kind: "EXTRAORDINARY",
      durationMinutes: 20,
    });

    const recovery = await recognizeRecovery(
      database,
      {
        cycleId: createdCycle!.id,
        tutorIds: [domainTutors[0]!.id],
        categoryId: recoveryCategory.id,
        direction: "CREDIT",
        duration: { durationMinutes: 30 },
        movementDate: "2027-02-16",
        note: "Explicit recovery recognition",
      },
      { actorId: admin.id, requestId: "recovery" },
    );

    expect(recovery.origin).toMatchObject({ kind: "RECOVERY" });

    await expect(
      recordBulkHourMovement(
        database,
        {
          cycleId: createdCycle!.id,
          tutorIds: [domainTutors[0]!.id],
          categoryId: meetingCategory.id,
          direction: "CREDIT",
          duration: { durationMinutes: 15 },
          movementDate: "2027-02-16",
          note: "Rollback should not persist",
        },
        { actorId: admin.id, requestId: "x".repeat(256) },
      ),
    ).rejects.toMatchObject({ code: HOUR_ERROR_CODES.transactionFailed });

    await expect(
      database
        .select({ id: hourMovement.id })
        .from(hourMovement)
        .where(
          and(
            eq(hourMovement.categoryId, meetingCategory.id),
            eq(hourMovement.cycleId, createdCycle!.id),
            eq(hourMovement.note, "Rollback should not persist"),
          ),
        ),
    ).resolves.toEqual([]);
    await expect(
      database
        .select({ id: activity.id })
        .from(activity)
        .where(eq(activity.note, "Rollback should not persist")),
    ).resolves.toEqual([]);

    const firstMovement = bulk.movements.find(
      (movement) => movement.tutor.id === domainTutors[0]!.id,
    )!;
    const reversal = await reverseHourMovement(database, firstMovement.id, {
      actorId: admin.id,
      requestId: "reversal",
    });

    expect(reversal.original).toMatchObject({
      id: firstMovement.id,
      direction: "CREDIT",
      durationMinutes: 90,
      reversalState: "REVERSED",
      reversalMovementId: reversal.reversal.id,
    });
    expect(reversal.reversal).toMatchObject({
      direction: "DEBIT",
      durationMinutes: 90,
      reversalOfMovementId: firstMovement.id,
      reversalState: "REVERSAL",
    });
    const [storedOriginal] = await database
      .select({
        direction: hourMovement.direction,
        durationMinutes: hourMovement.durationMinutes,
        note: hourMovement.note,
        reversalOfMovementId: hourMovement.reversalOfMovementId,
      })
      .from(hourMovement)
      .where(eq(hourMovement.id, firstMovement.id));
    expect(storedOriginal).toEqual({
      direction: "CREDIT",
      durationMinutes: 90,
      note: "Weekly coordination",
      reversalOfMovementId: null,
    });
    await expect(
      reverseHourMovement(database, firstMovement.id, { actorId: admin.id }),
    ).rejects.toMatchObject({ code: HOUR_ERROR_CODES.movementAlreadyReversed });
    await expect(
      reverseHourMovement(database, reversal.reversal.id, { actorId: admin.id }),
    ).rejects.toMatchObject({ code: HOUR_ERROR_CODES.reversalTargetInvalid });

    const balances = await listHourBalances(database, createdCycle!.id);
    expect(balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tutor: expect.objectContaining({ id: domainTutors[0]!.id }),
          signedBalanceMinutes: 50,
          state: "current",
        }),
        expect.objectContaining({
          tutor: expect.objectContaining({ id: domainTutors[1]!.id }),
          signedBalanceMinutes: 135,
          state: "current",
        }),
      ]),
    );

    await transitionHourCategoryStatus(
      database,
      meetingCategory.id,
      { status: "INACTIVE" },
      { actorId: admin.id, requestId: "category-inactive" },
    );
    const history = await listHourMovements(database, {
      cycleId: createdCycle!.id,
      limit: 20,
    });
    const meetingHistory = history.filter(
      (movement) => movement.category.id === meetingCategory.id,
    );
    expect(meetingHistory).toHaveLength(3);
    expect(meetingHistory.every((movement) => movement.category.status === "INACTIVE")).toBe(
      true,
    );

    await closeAdministrativeCycle(database, createdCycle!.id, {
      actorId: admin.id,
      requestId: "close-hours-cycle",
    });
    await expect(
      listHourBalances(database, createdCycle!.id, { activeOnly: true }),
    ).resolves.toHaveLength(2);
    await expect(
      listHourMovements(database, {
        cycleId: createdCycle!.id,
        limit: 20,
      }),
    ).resolves.toHaveLength(6);
    await expect(
      recordBulkHourMovement(
        database,
        {
          cycleId: createdCycle!.id,
          tutorIds: [domainTutors[0]!.id],
          categoryId: recoveryCategory.id,
          direction: "CREDIT",
          duration: { durationMinutes: 15 },
          movementDate: "2027-02-17",
        },
        { actorId: admin.id },
      ),
    ).rejects.toMatchObject({ code: HOUR_ERROR_CODES.cycleNotOpen });
    await expect(
      reverseHourMovement(database, workshop.movements[0]!.id, {
        actorId: admin.id,
        requestId: "closed-cycle-reversal",
      }),
    ).rejects.toMatchObject({ code: HOUR_ERROR_CODES.cycleNotOpen });

    const hourEvents = await listAuditEvents(database, 100);
    expect(
      hourEvents
        .filter((event) => event.entityType === "hour_movement")
        .every((event) => event.actorId === admin.id),
    ).toBe(true);
    expect(
      hourEvents
        .filter((event) => event.entityType === "activity")
        .every((event) => event.actorId === admin.id),
    ).toBe(true);
    expect(hourEvents.some((event) => event.requestId === "bulk-meeting")).toBe(true);
    expect(JSON.stringify(hourEvents)).not.toContain("password");
    expect(JSON.stringify(hourEvents)).not.toContain("token");
  });

  it("enforces Admin authorization across the live hour API boundaries", async () => {
    const database = getIntegrationDatabase();
    const { admin, tutor: tutorIdentity } = await seedIdentities();
    const routeMovementId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const hourApiBoundaries = [
      {
        name: "hour workspace GET",
        invoke: () => getAdminHours(),
      },
      {
        name: "hour movement GET",
        invoke: () =>
          getAdminHourMovements(
            new Request("http://localhost/api/admin/hours/movements"),
          ),
      },
      {
        name: "hour movement POST",
        invoke: () =>
          postAdminHourMovement(
            makeJsonRequest("http://localhost/api/admin/hours/movements", "POST", {}),
          ),
      },
      {
        name: "hour movement reversal POST",
        invoke: () =>
          postAdminHourMovementReverse(
            new Request(
              `http://localhost/api/admin/hours/movements/${routeMovementId}/reverse`,
              { method: "POST" },
            ),
            { params: Promise.resolve({ movementId: routeMovementId }) },
          ),
      },
      {
        name: "hour category GET",
        invoke: () =>
          getAdminHourCategories(
            new Request("http://localhost/api/admin/settings/hour-categories"),
          ),
      },
      {
        name: "hour category POST",
        invoke: () =>
          postAdminHourCategory(
            makeJsonRequest(
              "http://localhost/api/admin/settings/hour-categories",
              "POST",
              {},
            ),
          ),
      },
    ];

    for (const boundary of hourApiBoundaries) {
      await expect(boundary.invoke(), boundary.name).resolves.toMatchObject({
        status: 401,
      });
    }

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "ADMIN" },
    });

    const [createdCareer] = await database
      .insert(career)
      .values({ name: "Route Systems", normalizedName: "route systems" })
      .returning({ id: career.id });
    const createdCycle = await createAdministrativeCycle(
      database,
      {
        name: "Route Hour Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      { actorId: admin.id },
    );
    const [createdTutor] = await database
      .insert(tutor)
      .values({
        firstName: "Katherine",
        lastName: "Johnson",
        primaryCareerId: createdCareer!.id,
      })
      .returning({ id: tutor.id });

    await database.insert(tutorCycleMembership).values({
      tutorId: createdTutor!.id,
      cycleId: createdCycle.id,
    });

    const categoryResponse = await postAdminHourCategory(
      makeJsonRequest(
        "http://localhost/api/admin/settings/hour-categories",
        "POST",
        { name: "Route meeting", activityKind: "MEETING" },
      ),
    );
    expect(categoryResponse.status).toBe(201);
    const categoryBody = (await categoryResponse.json()) as {
      category: { id: string };
    };

    const categoryListResponse = await getAdminHourCategories(
      new Request(
        "http://localhost/api/admin/settings/hour-categories?status=ACTIVE",
      ),
    );
    expect(categoryListResponse.status).toBe(200);
    await expect(categoryListResponse.json()).resolves.toMatchObject({
      categories: [expect.objectContaining({ id: categoryBody.category.id })],
    });

    const workspaceResponse = await getAdminHours();
    expect(workspaceResponse.status).toBe(200);
    await expect(workspaceResponse.json()).resolves.toMatchObject({
      currentCycle: { id: createdCycle.id },
      eligibleTutors: [expect.objectContaining({ id: createdTutor!.id })],
      categories: [expect.objectContaining({ id: categoryBody.category.id })],
    });

    const movementResponse = await postAdminHourMovement(
      makeJsonRequest(
        "http://localhost/api/admin/hours/movements",
        "POST",
        {
          cycleId: createdCycle.id,
          tutorIds: [createdTutor!.id],
          categoryId: categoryBody.category.id,
          direction: "CREDIT",
          duration: { hours: 1, minutes: 0 },
          movementDate: "2027-02-15",
          note: "Route-created meeting",
        },
      ),
    );
    expect(movementResponse.status).toBe(201);
    const movementBody = (await movementResponse.json()) as {
      movements: Array<{ id: string }>;
    };
    const movementId = movementBody.movements[0]!.id;

    const historyResponse = await getAdminHourMovements(
      new Request(
        `http://localhost/api/admin/hours/movements?cycleId=${createdCycle.id}`,
      ),
    );
    expect(historyResponse.status).toBe(200);
    await expect(historyResponse.json()).resolves.toMatchObject({
      movements: [expect.objectContaining({ id: movementId })],
    });

    const reverseResponse = await postAdminHourMovementReverse(
      new Request(
        `http://localhost/api/admin/hours/movements/${movementId}/reverse`,
        { method: "POST" },
      ),
      { params: Promise.resolve({ movementId }) },
    );
    expect(reverseResponse.status).toBe(201);
    await expect(reverseResponse.json()).resolves.toMatchObject({
      original: { id: movementId, reversalState: "REVERSED" },
      reversal: { reversalOfMovementId: movementId },
    });

    const repeatedReverseResponse = await postAdminHourMovementReverse(
      new Request(
        `http://localhost/api/admin/hours/movements/${movementId}/reverse`,
        { method: "POST" },
      ),
      { params: Promise.resolve({ movementId }) },
    );
    expect(repeatedReverseResponse.status).toBe(409);
    await expect(repeatedReverseResponse.json()).resolves.toEqual({
      error: HOUR_ERROR_CODES.movementAlreadyReversed,
    });

    const renameResponse = await patchAdminHourCategory(
      makeJsonRequest(
        `http://localhost/api/admin/settings/hour-categories/${categoryBody.category.id}`,
        "PATCH",
        { name: "Renamed route meeting" },
      ),
      { params: Promise.resolve({ categoryId: categoryBody.category.id }) },
    );
    expect(renameResponse.status).toBe(200);

    const deactivateResponse = await patchAdminHourCategoryStatus(
      makeJsonRequest(
        `http://localhost/api/admin/settings/hour-categories/${categoryBody.category.id}/status`,
        "PATCH",
        { status: "INACTIVE" },
      ),
      { params: Promise.resolve({ categoryId: categoryBody.category.id }) },
    );
    expect(deactivateResponse.status).toBe(200);

    const historicalCategoriesResponse = await getAdminHourCategories(
      new Request("http://localhost/api/admin/settings/hour-categories"),
    );
    expect(historicalCategoriesResponse.status).toBe(200);
    await expect(historicalCategoriesResponse.json()).resolves.toMatchObject({
      categories: [
        expect.objectContaining({
          id: categoryBody.category.id,
          status: "INACTIVE",
        }),
      ],
    });

    const noActiveCategoriesResponse = await getAdminHours();
    expect(noActiveCategoriesResponse.status).toBe(409);
    await expect(noActiveCategoriesResponse.json()).resolves.toEqual({
      error: "no_active_categories",
    });

    authMocks.getSession.mockResolvedValue({
      user: { id: tutorIdentity.id, role: "TUTOR" },
    });
    for (const boundary of hourApiBoundaries) {
      await expect(boundary.invoke(), boundary.name).resolves.toMatchObject({
        status: 403,
      });
    }
  });

  it("records the complete cycle lifecycle with actor attribution and history", async () => {
    const database = getIntegrationDatabase();
    const { admin } = await seedIdentities();
    const created = await createAdministrativeCycle(
      database,
      {
        name: "Integration Cycle 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      {
        actorId: admin.id,
        requestId: "cycle-request-1",
        ipAddress: "203.0.113.20",
      },
    );

    await expect(getCurrentAdministrativeCycle(database)).resolves.toMatchObject({
      id: created.id,
      status: "OPEN",
    });

    const closed = await closeAdministrativeCycle(database, created.id, {
      actorId: admin.id,
      requestId: "cycle-request-2",
      ipAddress: "203.0.113.20",
    });

    expect(closed).toMatchObject({ id: created.id, status: "CLOSED" });
    await expect(getCurrentAdministrativeCycle(database)).resolves.toBeNull();
    await expect(listAdministrativeCycles(database)).resolves.toEqual([
      expect.objectContaining({ id: created.id, status: "CLOSED" }),
    ]);
    await expect(
      closeAdministrativeCycle(database, created.id, { actorId: admin.id }),
    ).rejects.toMatchObject({ code: "cycle_already_closed" });

    const cycleEvents = await listAuditEvents(database, 100);
    const lifecycleEvents = cycleEvents.filter(
      (event) => event.entityId === created.id,
    );
    expect(lifecycleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actorId: admin.id,
          action: "cycle.created",
          entityType: "administrative_cycle",
          metadata: {
            startDate: "2027-01-01",
            endDate: "2027-12-31",
            status: "OPEN",
          },
        }),
        expect.objectContaining({
          actorId: admin.id,
          action: "cycle.closed",
          entityType: "administrative_cycle",
          metadata: { previousStatus: "OPEN", status: "CLOSED" },
        }),
      ]),
    );
    expect(
      lifecycleEvents.some((event) => event.requestId === "cycle-request-1"),
    ).toBe(true);
    expect(
      lifecycleEvents.some((event) => event.requestId === "cycle-request-2"),
    ).toBe(true);
  });

  it("rejects sensitive audit metadata before it reaches PostgreSQL", async () => {
    const database = getIntegrationDatabase();

    await expect(
      recordAuditEvent(database, {
        action: "sensitive.integration.test",
        entityType: "test",
        entityId: "sensitive-1",
        metadata: { authorization: "Bearer synthetic-token" },
      }),
    ).rejects.toThrow();

    await expect(
      database
        .select({ id: auditEvent.id })
        .from(auditEvent)
        .where(eq(auditEvent.action, "sensitive.integration.test")),
    ).resolves.toEqual([]);
  });

  it("reads owner-scoped Tutor self-service models without mutation", async () => {
    const database = getIntegrationDatabase();
    const { admin, tutor: firstIdentity } = await seedIdentities();
    const secondIdentity = await provisionUser(
      database,
      {
        email: "second.tutor.integration@example.test",
        name: "Second Integration Tutor",
        role: "TUTOR",
        enabled: true,
      },
      { actorId: admin.id, source: "admin" },
    );
    const unlinkedIdentity = await provisionUser(
      database,
      {
        email: "unlinked.tutor.integration@example.test",
        name: "Unlinked Integration Tutor",
        role: "TUTOR",
        enabled: true,
      },
      { actorId: admin.id, source: "admin" },
    );
    const auditContext = {
      actorId: admin.id,
      requestId: "tutor-self-service-read-test",
    };
    const careerRecord = await createCareer(
      database,
      { name: "Self-Service Engineering" },
      auditContext,
    );
    const firstSubject = await createSubject(
      database,
      { name: "Owner-scoped Algorithms", careerId: careerRecord.id },
      auditContext,
    );
    const secondSubject = await createSubject(
      database,
      { name: "Owner-scoped Physics", careerId: careerRecord.id },
      auditContext,
    );
    const scholarship = await createScholarshipReference(
      database,
      {
        type: "Self-Service Reference",
        knownRequiredHours: 120,
        notes: "Informational reference",
      },
      auditContext,
    );
    const openCycle = await createAdministrativeCycle(
      database,
      {
        name: "Self-Service 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      auditContext,
    );
    const [closedCycle] = await database
      .insert(administrativeCycle)
      .values({
        name: "Self-Service 2026",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: "CLOSED",
      })
      .returning({ id: administrativeCycle.id });

    const firstTutor = await createTutor(
      database,
      {
        firstName: "Ada",
        lastName: "Lovelace",
        preferredDisplayName: "Ada",
        primaryCareerId: careerRecord.id,
        subjectIds: [firstSubject.id],
        cycleId: openCycle.id,
        scholarshipReferenceId: scholarship.id,
        applicationEmail: firstIdentity.email,
      },
      auditContext,
    );
    const secondTutor = await createTutor(
      database,
      {
        firstName: "Grace",
        lastName: "Hopper",
        primaryCareerId: careerRecord.id,
        subjectIds: [secondSubject.id],
        cycleId: openCycle.id,
        applicationEmail: secondIdentity.email,
      },
      auditContext,
    );

    const regularPlan = await createSchedulePlan(
      database,
      {
        cycleId: openCycle.id,
        name: "Self-Service Regular",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      },
      auditContext,
    );
    const specialPlan = await createSchedulePlan(
      database,
      {
        cycleId: openCycle.id,
        name: "Self-Service Special",
        kind: "SPECIAL",
        validFrom: "2027-04-05",
        validTo: "2027-04-07",
      },
      auditContext,
    );
    const regularAssignment = await createScheduleAssignment(
      database,
      {
        planId: regularPlan.id,
        tutorId: firstTutor.id,
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 480,
        endMinutes: 600,
        kind: "DUTY",
        modality: "In-person",
      },
      auditContext,
    );
    await createScheduleAssignment(
      database,
      {
        planId: regularPlan.id,
        tutorId: secondTutor.id,
        pattern: "WEEKDAY",
        weekday: 1,
        startMinutes: 840,
        endMinutes: 960,
        kind: "DUTY",
        modality: "Online",
      },
      auditContext,
    );
    const specialAssignment = await createScheduleAssignment(
      database,
      {
        planId: specialPlan.id,
        tutorId: firstTutor.id,
        pattern: "DATE",
        assignmentDate: "2027-04-05",
        startMinutes: 600,
        endMinutes: 720,
        kind: "DUTY",
        modality: "Special room",
      },
      auditContext,
    );

    const category = await createHourCategory(
      database,
      { name: "Self-Service Duty Hours" },
      auditContext,
    );
    await recordBulkHourMovement(
      database,
      {
        cycleId: openCycle.id,
        tutorIds: [firstTutor.id],
        categoryId: category.id,
        direction: "CREDIT",
        duration: { hours: 2, minutes: 0 },
        movementDate: "2027-04-05",
        note: "First tutor credit",
      },
      auditContext,
    );
    await recordBulkHourMovement(
      database,
      {
        cycleId: openCycle.id,
        tutorIds: [firstTutor.id],
        categoryId: category.id,
        direction: "DEBIT",
        duration: { hours: 0, minutes: 30 },
        movementDate: "2027-04-06",
        note: "First tutor debit",
      },
      auditContext,
    );
    await recordBulkHourMovement(
      database,
      {
        cycleId: openCycle.id,
        tutorIds: [secondTutor.id],
        categoryId: category.id,
        direction: "CREDIT",
        duration: { hours: 1, minutes: 0 },
        movementDate: "2027-04-05",
        note: "Second tutor credit",
      },
      auditContext,
    );
    await database.insert(hourMovement).values({
      cycleId: closedCycle!.id,
      tutorId: firstTutor.id,
      categoryId: category.id,
      direction: "CREDIT",
      durationMinutes: 999,
      movementDate: "2026-06-01",
      note: "Closed cycle history",
      actorId: admin.id,
    });

    const beforeCounts = await Promise.all([
      database.select({ id: dutyOccurrence.id }).from(dutyOccurrence),
      database.select({ id: attendanceRecord.id }).from(attendanceRecord),
      database.select({ id: hourMovement.id }).from(hourMovement),
      database.select({ id: activity.id }).from(activity),
      database.select({ id: auditEvent.id }).from(auditEvent),
    ]);

    const summary = await getTutorSelfServiceSummary(
      database,
      firstIdentity.id,
      { today: "2027-04-05" },
    );
    const defaultSchedule = await getTutorSelfServiceSchedule(
      database,
      firstIdentity.id,
      {},
      { today: "2027-04-05" },
    );
    const specialSchedule = await getTutorSelfServiceSchedule(
      database,
      firstIdentity.id,
      { date: "2027-04-05" },
      { today: "2027-04-05" },
    );
    const regularSchedule = await getTutorSelfServiceSchedule(
      database,
      firstIdentity.id,
      { date: "2027-04-12" },
      { today: "2027-04-05" },
    );
    const firstHours = await getTutorSelfServiceHours(
      database,
      firstIdentity.id,
    );
    const secondHours = await getTutorSelfServiceHours(
      database,
      secondIdentity.id,
    );
    const unlinkedSummary = await getTutorSelfServiceSummary(
      database,
      unlinkedIdentity.id,
      { today: "2027-04-05" },
    );

    expect(summary).toMatchObject({
      state: "ready",
      cycle: { id: openCycle.id },
      tutor: {
        displayName: "Ada",
        subjects: [{ id: firstSubject.id, status: "ACTIVE" }],
      },
      membership: { cycleId: openCycle.id, scholarshipReference: { id: scholarship.id } },
      balance: { signedBalanceMinutes: 90, state: "current" },
    });
    expect(defaultSchedule).toMatchObject({
      state: "ready",
      effectivePlan: { id: specialPlan.id, kind: "SPECIAL" },
      nextDuty: { id: specialAssignment.id, date: "2027-04-05" },
    });
    if (summary.state !== "ready" || defaultSchedule.state !== "ready") {
      throw new Error("Expected the linked Tutor read models to be ready.");
    }
    expect(summary.nextDuty).toEqual(defaultSchedule.nextDuty);

    expect(specialSchedule).toMatchObject({
      state: "ready",
      effectivePlan: { id: specialPlan.id },
      days: expect.arrayContaining([
        expect.objectContaining({
          date: "2027-04-05",
          assignments: [expect.objectContaining({ id: specialAssignment.id })],
        }),
      ]),
    });
    expect(JSON.stringify(specialSchedule)).not.toContain(regularAssignment.id);
    expect(JSON.stringify(specialSchedule)).not.toContain(secondTutor.id);
    expect(regularSchedule).toMatchObject({
      state: "ready",
      effectivePlan: { id: regularPlan.id, kind: "REGULAR" },
      days: expect.arrayContaining([
        expect.objectContaining({
          date: "2027-04-12",
          assignments: [expect.objectContaining({ id: regularAssignment.id })],
        }),
      ]),
    });

    expect(firstHours).toMatchObject({
      state: "ready",
      cycle: { id: openCycle.id },
      balance: { signedBalanceMinutes: 90, state: "current" },
      historyComplete: true,
    });
    expect(secondHours).toMatchObject({
      state: "ready",
      balance: { signedBalanceMinutes: 60, state: "current" },
    });
    if (firstHours.state !== "ready" || secondHours.state !== "ready") {
      throw new Error("Expected linked Tutor hour models to be ready.");
    }
    expect(firstHours.movements).toHaveLength(2);
    expect(firstHours.movements.map((movement) => movement.note)).toEqual(
      expect.arrayContaining(["First tutor credit", "First tutor debit"]),
    );
    expect(JSON.stringify(firstHours)).not.toContain("Closed cycle history");
    expect(JSON.stringify(firstHours)).not.toContain("Second tutor credit");
    expect(JSON.stringify(firstHours)).not.toContain("actorId");
    expect(JSON.stringify(firstHours)).not.toContain("session");
    expect(unlinkedSummary).toEqual({
      state: "required-action",
      reason: "ACCOUNT_NOT_LINKED",
    });

    authMocks.getSession.mockResolvedValue({
      user: { id: firstIdentity.id, role: "TUTOR" },
    });
    const routeSummaryResponse = await getTutorSummary(
      new Request("http://localhost/api/tutor/summary"),
    );
    expect(routeSummaryResponse.status).toBe(200);
    expect(routeSummaryResponse.headers.get("Cache-Control")).toBe("no-store");
    const routeSummaryBody = await routeSummaryResponse.json();
    expect(routeSummaryBody).toMatchObject({
      state: "ready",
      tutor: { displayName: "Ada" },
    });
    expect(JSON.stringify(routeSummaryBody)).not.toContain("tutorId");
    expect(JSON.stringify(routeSummaryBody)).not.toContain(secondIdentity.email);

    const routeScheduleResponse = await getTutorSchedule(
      new Request("http://localhost/api/tutor/schedule?date=2027-04-05"),
    );
    expect(routeScheduleResponse.status).toBe(200);
    expect(routeScheduleResponse.headers.get("Cache-Control")).toBe("no-store");
    await expect(routeScheduleResponse.json()).resolves.toMatchObject({
      effectivePlan: { id: specialPlan.id, kind: "SPECIAL" },
      state: "ready",
    });

    const routeHoursResponse = await getTutorHours(
      new Request("http://localhost/api/tutor/hours"),
    );
    expect(routeHoursResponse.status).toBe(200);
    expect(routeHoursResponse.headers.get("Cache-Control")).toBe("no-store");
    await expect(routeHoursResponse.json()).resolves.toMatchObject({
      balance: { signedBalanceMinutes: 90 },
      state: "ready",
    });

    authMocks.getSession.mockResolvedValue(null);
    expect(
      (
        await getTutorSummary(
          new Request("http://localhost/api/tutor/summary"),
        )
      ).status,
    ).toBe(401);

    authMocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "ADMIN" },
    });
    expect(
      (
        await getTutorSchedule(
          new Request("http://localhost/api/tutor/schedule"),
        )
      ).status,
    ).toBe(403);
    await expect(
      getTutorSummary(new Request("http://localhost/api/tutor/summary")),
    ).resolves.toMatchObject({ status: 403 });

    const afterCounts = await Promise.all([
      database.select({ id: dutyOccurrence.id }).from(dutyOccurrence),
      database.select({ id: attendanceRecord.id }).from(attendanceRecord),
      database.select({ id: hourMovement.id }).from(hourMovement),
      database.select({ id: activity.id }).from(activity),
      database.select({ id: auditEvent.id }).from(auditEvent),
    ]);
    expect(afterCounts.map((rows) => rows.length)).toEqual(
      beforeCounts.map((rows) => rows.length),
    );
  });

  it("returns a required action when a linked Tutor has no open cycle", async () => {
    const database = getIntegrationDatabase();
    const { admin, tutor: tutorIdentity } = await seedIdentities();
    const auditContext = {
      actorId: admin.id,
      requestId: "tutor-self-service-no-cycle-test",
    };
    const careerRecord = await createCareer(
      database,
      { name: "No Cycle Engineering" },
      auditContext,
    );
    const cycle = await createAdministrativeCycle(
      database,
      {
        name: "Closed Self-Service Cycle",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      },
      auditContext,
    );
    const linkedTutor = await createTutor(
      database,
      {
        firstName: "Linked",
        lastName: "WithoutCycle",
        primaryCareerId: careerRecord.id,
        cycleId: cycle.id,
        applicationEmail: tutorIdentity.email,
      },
      auditContext,
    );
    await database
      .delete(tutorCycleMembership)
      .where(
        and(
          eq(tutorCycleMembership.tutorId, linkedTutor.id),
          eq(tutorCycleMembership.cycleId, cycle.id),
        ),
      );

    await expect(
      getTutorSelfServiceSummary(database, tutorIdentity.id, {
        today: "2027-04-05",
      }),
    ).resolves.toMatchObject({
      state: "required-action",
      reason: "CYCLE_MEMBERSHIP_REQUIRED",
      cycle: { id: cycle.id },
    });

    await closeAdministrativeCycle(database, cycle.id, auditContext);

    await expect(
      getTutorSelfServiceSummary(database, tutorIdentity.id, {
        today: "2027-04-05",
      }),
    ).resolves.toEqual({
      state: "required-action",
      reason: "OPEN_CYCLE_REQUIRED",
    });
  });
});
