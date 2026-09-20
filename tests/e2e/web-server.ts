import path from "node:path";
import { spawn } from "node:child_process";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  createDatabaseHandle,
  type DatabaseHandle,
} from "../../src/db/client-core";
import {
  activity,
  administrativeCycle,
  attendanceRecord,
  career,
  dutyOccurrence,
  hourCategory,
  hourMovement,
  scholarshipReference,
  scheduleAssignment,
  schedulePlan,
  session,
  subject,
  tutor,
  tutorCycleMembership,
  tutorSubject,
  user,
} from "../../src/db/schema";
import {
  E2E_ADMIN_SESSION_TOKEN,
  E2E_ADMIN_USER_ID,
  E2E_ABSENCE_ASSIGNMENT_ID,
  E2E_ABSENCE_DEBIT_CATEGORY_ID,
  E2E_ABSENCE_OCCURRENCE_ID,
  E2E_ATTENDANCE_TUTOR_ID,
  E2E_AUTH_SECRET,
  E2E_CAREER_ID,
  E2E_CYCLE_ID,
  E2E_INACTIVE_CATEGORY_ID,
  E2E_INACTIVE_TUTOR_ID,
  E2E_MANUAL_CATEGORY_ID,
  E2E_MEETING_CATEGORY_ID,
  E2E_PRESENT_ASSIGNMENT_ID,
  E2E_PRESENT_OCCURRENCE_ID,
  E2E_PRIMARY_TUTOR_ID,
  E2E_RECOVERY_ASSIGNMENT_ID,
  E2E_RECOVERY_CATEGORY_ID,
  E2E_RECOVERY_OCCURRENCE_ID,
  E2E_REGULAR_ASSIGNMENT_ID,
  E2E_REGULAR_PLAN_ID,
  E2E_SECONDARY_TUTOR_ID,
  E2E_SEEDED_ACTIVITY_ID,
  E2E_SEEDED_MOVEMENT_ID,
  E2E_SPECIAL_PLAN_ID,
} from "./e2e-test-data";

const POSTGRES_IMAGE = "postgres:16.4-alpine";
const E2E_DATABASE_NAME = "sgta_e2e";
const E2E_DATABASE_USER = "sgta_e2e";
const E2E_DATABASE_PASSWORD = "sgta_e2e_password";
let container: StartedPostgreSqlContainer | undefined;
let databaseHandle: DatabaseHandle | undefined;
let serverProcess: ReturnType<typeof spawn> | undefined;
let shuttingDown = false;

async function seedDatabase() {
  if (databaseHandle === undefined) {
    throw new Error("The E2E database is not ready.");
  }

  const database = databaseHandle.db;
  const [admin] = await database
    .insert(user)
    .values({
      id: E2E_ADMIN_USER_ID,
      name: "E2E Admin",
      email: "admin.e2e@example.test",
      emailVerified: true,
      role: "ADMIN",
      enabled: true,
    })
    .returning({ id: user.id });

  if (admin === undefined) {
    throw new Error("The E2E Admin fixture could not be created.");
  }

  await database.insert(session).values({
    id: "e2e-admin-session",
    token: E2E_ADMIN_SESSION_TOKEN,
    expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    userId: admin.id,
    ipAddress: "127.0.0.1",
    userAgent: "Playwright E2E",
  });

  await database.insert(administrativeCycle).values({
    id: E2E_CYCLE_ID,
    name: "2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN",
  });

  await database.insert(career).values({
    id: E2E_CAREER_ID,
    name: "Computer Science",
    normalizedName: "computer science",
    status: "ACTIVE",
  });

  await database.insert(subject).values([
    {
      id: "33333333-3333-4333-8333-333333333333",
      careerId: E2E_CAREER_ID,
      name: "Algorithms",
      normalizedName: "algorithms",
      status: "ACTIVE",
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      careerId: E2E_CAREER_ID,
      name: "Data Structures",
      normalizedName: "data structures",
      status: "ACTIVE",
    },
  ]);

  await database.insert(scholarshipReference).values({
    id: "55555555-5555-4555-8555-555555555555",
    type: "Institutional Scholarship",
    normalizedType: "institutional scholarship",
    knownRequiredHours: 120,
    notes: "Synthetic reference for browser verification.",
    status: "ACTIVE",
  });

  await database.insert(tutor).values([
    {
      id: E2E_PRIMARY_TUTOR_ID,
      firstName: "Ada",
      lastName: "Lovelace",
      preferredDisplayName: "Ada",
      institutionalIdentifier: "E2E-001",
      normalizedInstitutionalIdentifier: "e2e-001",
      primaryCareerId: E2E_CAREER_ID,
      status: "ACTIVE",
    },
    {
      id: E2E_SECONDARY_TUTOR_ID,
      firstName: "Grace",
      lastName: "Hopper",
      preferredDisplayName: "Grace",
      institutionalIdentifier: "E2E-002",
      normalizedInstitutionalIdentifier: "e2e-002",
      primaryCareerId: E2E_CAREER_ID,
      status: "ACTIVE",
    },
    {
      id: E2E_INACTIVE_TUTOR_ID,
      firstName: "Inactive",
      lastName: "Tutor",
      preferredDisplayName: "Inactive",
      institutionalIdentifier: "E2E-003",
      normalizedInstitutionalIdentifier: "e2e-003",
      primaryCareerId: E2E_CAREER_ID,
      status: "INACTIVE",
    },
    {
      id: E2E_ATTENDANCE_TUTOR_ID,
      firstName: "Marie",
      lastName: "Curie",
      preferredDisplayName: "Marie",
      institutionalIdentifier: "E2E-004",
      normalizedInstitutionalIdentifier: "e2e-004",
      primaryCareerId: E2E_CAREER_ID,
      status: "ACTIVE",
    },
  ]);

  await database.insert(tutorSubject).values({
    tutorId: E2E_PRIMARY_TUTOR_ID,
    subjectId: "33333333-3333-4333-8333-333333333333",
  });

  await database.insert(tutorCycleMembership).values([
    {
      tutorId: E2E_PRIMARY_TUTOR_ID,
      cycleId: E2E_CYCLE_ID,
      scholarshipReferenceId: "55555555-5555-4555-8555-555555555555",
    },
    { tutorId: E2E_SECONDARY_TUTOR_ID, cycleId: E2E_CYCLE_ID },
    { tutorId: E2E_INACTIVE_TUTOR_ID, cycleId: E2E_CYCLE_ID },
    { tutorId: E2E_ATTENDANCE_TUTOR_ID, cycleId: E2E_CYCLE_ID },
  ]);

  await database.insert(hourCategory).values([
    {
      id: E2E_MEETING_CATEGORY_ID,
      name: "Meeting credit",
      normalizedName: "meeting credit",
      activityKind: "MEETING",
      status: "ACTIVE",
    },
    {
      id: E2E_MANUAL_CATEGORY_ID,
      name: "Manual credit",
      normalizedName: "manual credit",
      activityKind: null,
      status: "ACTIVE",
    },
    {
      id: E2E_INACTIVE_CATEGORY_ID,
      name: "Archived activity",
      normalizedName: "archived activity",
      activityKind: "EXTRAORDINARY",
      status: "INACTIVE",
    },
    {
      id: E2E_ABSENCE_DEBIT_CATEGORY_ID,
      name: "Absence debit",
      normalizedName: "absence debit",
      activityKind: null,
      status: "ACTIVE",
    },
    {
      id: E2E_RECOVERY_CATEGORY_ID,
      name: "Scheduled recovery",
      normalizedName: "scheduled recovery",
      activityKind: "RECOVERY",
      status: "ACTIVE",
    },
  ]);

  await database.insert(schedulePlan).values([
    {
      id: E2E_REGULAR_PLAN_ID,
      cycleId: E2E_CYCLE_ID,
      name: "Regular 2027",
      kind: "REGULAR",
      validFrom: "2027-01-01",
      validTo: "2027-12-31",
      status: "ACTIVE",
    },
    {
      id: E2E_SPECIAL_PLAN_ID,
      cycleId: E2E_CYCLE_ID,
      name: "Attendance special 2027",
      kind: "SPECIAL",
      validFrom: "2027-01-18",
      validTo: "2027-01-18",
      status: "ACTIVE",
    },
  ]);

  await database.insert(scheduleAssignment).values([
    {
      id: E2E_REGULAR_ASSIGNMENT_ID,
      planId: E2E_REGULAR_PLAN_ID,
      tutorId: E2E_PRIMARY_TUTOR_ID,
      pattern: "WEEKDAY",
      weekday: 1,
      startMinutes: 480,
      endMinutes: 540,
      kind: "DUTY",
      modality: "Regular room",
      status: "ACTIVE",
    },
    {
      id: E2E_PRESENT_ASSIGNMENT_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      tutorId: E2E_ATTENDANCE_TUTOR_ID,
      pattern: "DATE",
      assignmentDate: "2027-01-18",
      startMinutes: 480,
      endMinutes: 600,
      kind: "DUTY",
      modality: "Attendance room",
      status: "ACTIVE",
    },
    {
      id: E2E_ABSENCE_ASSIGNMENT_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      tutorId: E2E_ATTENDANCE_TUTOR_ID,
      pattern: "DATE",
      assignmentDate: "2027-01-18",
      startMinutes: 600,
      endMinutes: 720,
      kind: "DUTY",
      modality: "Attendance room",
      status: "ACTIVE",
    },
    {
      id: E2E_RECOVERY_ASSIGNMENT_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      tutorId: E2E_ATTENDANCE_TUTOR_ID,
      pattern: "DATE",
      assignmentDate: "2027-01-18",
      startMinutes: 780,
      endMinutes: 840,
      kind: "RECOVERY",
      modality: "Recovery room",
      status: "ACTIVE",
    },
  ]);

  await database.insert(dutyOccurrence).values([
    {
      id: E2E_PRESENT_OCCURRENCE_ID,
      cycleId: E2E_CYCLE_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      assignmentId: E2E_PRESENT_ASSIGNMENT_ID,
      tutorId: E2E_ATTENDANCE_TUTOR_ID,
      occurrenceDate: "2027-01-18",
      startMinutes: 480,
      endMinutes: 600,
      kind: "DUTY",
      modality: "Attendance room",
    },
    {
      id: E2E_ABSENCE_OCCURRENCE_ID,
      cycleId: E2E_CYCLE_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      assignmentId: E2E_ABSENCE_ASSIGNMENT_ID,
      tutorId: E2E_ATTENDANCE_TUTOR_ID,
      occurrenceDate: "2027-01-18",
      startMinutes: 600,
      endMinutes: 720,
      kind: "DUTY",
      modality: "Attendance room",
    },
    {
      id: E2E_RECOVERY_OCCURRENCE_ID,
      cycleId: E2E_CYCLE_ID,
      planId: E2E_SPECIAL_PLAN_ID,
      assignmentId: E2E_RECOVERY_ASSIGNMENT_ID,
      tutorId: E2E_ATTENDANCE_TUTOR_ID,
      occurrenceDate: "2027-01-18",
      startMinutes: 780,
      endMinutes: 840,
      kind: "RECOVERY",
      modality: "Recovery room",
    },
  ]);

  await database.insert(attendanceRecord).values([
    {
      occurrenceId: E2E_PRESENT_OCCURRENCE_ID,
      status: "PENDING",
      debitStatus: "NOT_PROPOSED",
      actorId: admin.id,
    },
    {
      occurrenceId: E2E_ABSENCE_OCCURRENCE_ID,
      status: "PENDING",
      debitStatus: "NOT_PROPOSED",
      actorId: admin.id,
    },
    {
      occurrenceId: E2E_RECOVERY_OCCURRENCE_ID,
      status: "PENDING",
      debitStatus: "NOT_PROPOSED",
      actorId: admin.id,
    },
  ]);

  await database.insert(activity).values({
    id: E2E_SEEDED_ACTIVITY_ID,
    cycleId: E2E_CYCLE_ID,
    kind: "MEETING",
    activityDate: "2027-01-15",
    durationMinutes: 30,
    note: "Seeded meeting origin.",
    actorId: admin.id,
  });

  await database.insert(hourMovement).values({
    id: E2E_SEEDED_MOVEMENT_ID,
    cycleId: E2E_CYCLE_ID,
    tutorId: E2E_PRIMARY_TUTOR_ID,
    categoryId: E2E_MEETING_CATEGORY_ID,
    direction: "CREDIT",
    durationMinutes: 30,
    movementDate: "2027-01-15",
    note: "Seeded meeting movement.",
    activityId: E2E_SEEDED_ACTIVITY_ID,
    actorId: admin.id,
  });
}

async function closeDatabase() {
  const currentHandle = databaseHandle;
  const currentContainer = container;
  databaseHandle = undefined;
  container = undefined;

  await currentHandle?.close();
  await currentContainer?.stop();
}

async function shutdown(exitCode: number) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (serverProcess !== undefined && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
  }

  await closeDatabase();
  process.exit(exitCode);
}

async function main() {
  container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withDatabase(E2E_DATABASE_NAME)
    .withUsername(E2E_DATABASE_USER)
    .withPassword(E2E_DATABASE_PASSWORD)
    .start();

  databaseHandle = createDatabaseHandle({
    connectionString: container.getConnectionUri(),
    max: 5,
    connectionTimeoutMillis: 10_000,
  });

  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  await migrate(databaseHandle.db, { migrationsFolder });
  await migrate(databaseHandle.db, { migrationsFolder });
  await seedDatabase();

  const nextBin = path.resolve(
    process.cwd(),
    "node_modules/next/dist/bin/next",
  );
  serverProcess = spawn(process.execPath, [nextBin, "dev"], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      DATABASE_URL: container.getConnectionUri(),
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      GOOGLE_CLIENT_ID: "e2e-google-client-id",
      GOOGLE_CLIENT_SECRET: "e2e-google-client-secret",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: "3000",
    },
    stdio: "inherit",
  });

  serverProcess.once("exit", (code) => {
    void shutdown(code ?? 1);
  });

  process.once("SIGINT", () => void shutdown(130));
  process.once("SIGTERM", () => void shutdown(143));
}

void main().catch(async (error: unknown) => {
  console.error(error);
  await closeDatabase();
  process.exit(1);
});
