import { and, eq, sql } from "drizzle-orm";
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
import { GET as getAdminTutorDetail, PATCH as patchAdminTutorDetail } from "@/app/api/admin/tutors/[tutorId]/route";
import { PATCH as patchAdminTutorStatus } from "@/app/api/admin/tutors/[tutorId]/status/route";
import {
  GET as getAdminTutorCollection,
  POST as postAdminTutorCollection,
} from "@/app/api/admin/tutors/route";
import { GET as getAdminTutorSubjects } from "@/app/api/admin/tutors/subjects/route";
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
import { requireApiRole, requireRole } from "@/auth/authorization";
import { createAuthOptions } from "@/auth/options";
import type { AuthEnvironment } from "@/auth/options";
import { recordAuditEvent, listAuditEvents } from "@/db/audit-core";
import {
  account,
  activity,
  administrativeCycle,
  auditEvent,
  career,
  hourCategory,
  hourMovement,
  scholarshipReference,
  session,
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
  createCareer,
  createScholarshipReference,
  createSubject,
  createTutor,
  getActiveCatalogOptions,
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
import { provisionUser } from "@/auth/provisioning";

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
    sql`TRUNCATE TABLE "hour_movement", "activity", "hour_category", "tutor_cycle_membership", "tutor_subject", "tutor", "scholarship_reference", "subject", "career", "audit_event", "session", "account", "verification", "administrative_cycle", "user" CASCADE`,
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
          AND table_name IN ('user', 'session', 'account', 'verification', 'administrative_cycle', 'audit_event', 'career', 'subject', 'scholarship_reference', 'tutor', 'tutor_subject', 'tutor_cycle_membership', 'hour_category', 'activity', 'hour_movement')
        ORDER BY table_name
      `),
    );
    const migrations = getRows<{ migration_count: string }>(
      await database.execute(sql`
        SELECT count(*)::text AS migration_count
        FROM "drizzle"."__drizzle_migrations"
      `),
    );
    const deferredTables = getRows<{ table_name: string }>(
      await database.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('schedule', 'attendance', 'consultation')
      `),
    );
    const indexes = getRows<{ indexname: string }>(
      await database.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'activity_cycle_date_idx',
            'activity_kind_idx',
            'career_normalized_name_unique',
            'hour_category_normalized_name_unique',
            'hour_category_status_idx',
            'hour_movement_activity_idx',
            'hour_movement_category_idx',
            'hour_movement_cycle_tutor_date_idx',
            'hour_movement_reversal_unique',
            'subject_career_normalized_name_unique',
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
          AND conname IN (
            'activity_actor_id_user_id_fk',
            'activity_cycle_id_administrative_cycle_id_fk',
            'hour_movement_activity_id_activity_id_fk',
            'hour_movement_actor_id_user_id_fk',
            'hour_movement_category_id_hour_category_id_fk',
            'hour_movement_cycle_id_administrative_cycle_id_fk',
            'hour_movement_reversal_of_movement_id_hour_movement_id_fk',
            'hour_movement_tutor_id_tutor_id_fk',
            'subject_career_id_career_id_fk',
            'tutor_primary_career_id_career_id_fk',
            'tutor_cycle_membership_tutor_id_tutor_id_fk',
            'tutor_cycle_membership_cycle_id_administrative_cycle_id_fk',
            'tutor_cycle_membership_scholarship_reference_id_scholarship_reference_id_fk',
            'tutor_subject_tutor_id_tutor_id_fk',
            'tutor_subject_subject_id_subject_id_fk'
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
            'career_name_not_blank_check',
            'career_normalized_name_not_blank_check',
            'career_normalized_name_check',
            'hour_category_name_not_blank_check',
            'hour_category_normalized_name_not_blank_check',
            'hour_category_normalized_name_check',
            'hour_movement_duration_minutes_positive_check',
            'hour_movement_note_not_blank_check',
            'hour_movement_not_self_reversal_check',
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
        WHERE type.typname IN ('user_role', 'administrative_cycle_status', 'record_status', 'hour_movement_direction', 'activity_kind')
        ORDER BY type.typname, enum.enumsortorder
      `),
    );

    expect(POSTGRES_IMAGE).toBe("postgres:16.4-alpine");
    expect(tables.map((row) => row.table_name)).toEqual([
      "account",
      "activity",
      "administrative_cycle",
      "audit_event",
      "career",
      "hour_category",
      "hour_movement",
      "scholarship_reference",
      "session",
      "subject",
      "tutor",
      "tutor_cycle_membership",
      "tutor_subject",
      "user",
      "verification",
    ]);
    expect(migrations[0]?.migration_count).toBe("3");
    expect(enumValues).toEqual([
      { typname: "activity_kind", enumlabel: "MEETING" },
      { typname: "activity_kind", enumlabel: "WORKSHOP" },
      { typname: "activity_kind", enumlabel: "EXTRAORDINARY" },
      { typname: "activity_kind", enumlabel: "RECOVERY" },
      { typname: "administrative_cycle_status", enumlabel: "OPEN" },
      { typname: "administrative_cycle_status", enumlabel: "CLOSED" },
      { typname: "hour_movement_direction", enumlabel: "CREDIT" },
      { typname: "hour_movement_direction", enumlabel: "DEBIT" },
      { typname: "record_status", enumlabel: "ACTIVE" },
      { typname: "record_status", enumlabel: "INACTIVE" },
      { typname: "user_role", enumlabel: "ADMIN" },
      { typname: "user_role", enumlabel: "TUTOR" },
    ]);
    expect(deferredTables).toEqual([]);
    expect(indexes.map((row) => row.indexname)).toEqual([
      "activity_cycle_date_idx",
      "activity_kind_idx",
      "career_normalized_name_unique",
      "hour_category_normalized_name_unique",
      "hour_category_status_idx",
      "hour_movement_activity_idx",
      "hour_movement_category_idx",
      "hour_movement_cycle_tutor_date_idx",
      "hour_movement_reversal_unique",
      "subject_career_normalized_name_unique",
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
      "hour_movement_activity_id_activity_id_fk",
      "hour_movement_actor_id_user_id_fk",
      "hour_movement_category_id_hour_category_id_fk",
      "hour_movement_cycle_id_administrative_cycle_id_fk",
      "hour_movement_reversal_of_movement_id_hour_movement_id_fk",
      "hour_movement_tutor_id_tutor_id_fk",
      "subject_career_id_career_id_fk",
      "tutor_cycle_membership_cycle_id_administrative_cycle_id_fk",
      "tutor_cycle_membership_scholarship_reference_id_scholarship_ref",
      "tutor_cycle_membership_tutor_id_tutor_id_fk",
      "tutor_primary_career_id_career_id_fk",
      "tutor_subject_subject_id_subject_id_fk",
      "tutor_subject_tutor_id_tutor_id_fk",
    ]);
    expect(checks.map((row) => row.conname)).toEqual([
      "activity_duration_minutes_positive_check",
      "activity_note_not_blank_check",
      "career_name_not_blank_check",
      "career_normalized_name_check",
      "career_normalized_name_not_blank_check",
      "hour_category_name_not_blank_check",
      "hour_category_normalized_name_check",
      "hour_category_normalized_name_not_blank_check",
      "hour_movement_duration_minutes_positive_check",
      "hour_movement_not_self_reversal_check",
      "hour_movement_note_not_blank_check",
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
    ]);
    expect(getIntegrationConnectionString()).toMatch(
      /^postgres(?:ql)?:\/\/[^/]+\/sgta_integration$/,
    );
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
});
