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
  administrativeCycle,
  career,
  scholarshipReference,
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
  E2E_AUTH_SECRET,
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
    id: "11111111-1111-4111-8111-111111111111",
    name: "2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN",
  });

  await database.insert(career).values({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Computer Science",
    normalizedName: "computer science",
    status: "ACTIVE",
  });

  await database.insert(subject).values([
    {
      id: "33333333-3333-4333-8333-333333333333",
      careerId: "22222222-2222-4222-8222-222222222222",
      name: "Algorithms",
      normalizedName: "algorithms",
      status: "ACTIVE",
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      careerId: "22222222-2222-4222-8222-222222222222",
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

  await database.insert(tutor).values({
    id: "66666666-6666-4666-8666-666666666666",
    firstName: "Ada",
    lastName: "Lovelace",
    preferredDisplayName: "Ada",
    institutionalIdentifier: "E2E-001",
    normalizedInstitutionalIdentifier: "e2e-001",
    primaryCareerId: "22222222-2222-4222-8222-222222222222",
    status: "ACTIVE",
  });

  await database.insert(tutorSubject).values({
    tutorId: "66666666-6666-4666-8666-666666666666",
    subjectId: "33333333-3333-4333-8333-333333333333",
  });

  await database.insert(tutorCycleMembership).values({
    tutorId: "66666666-6666-4666-8666-666666666666",
    cycleId: "11111111-1111-4111-8111-111111111111",
    scholarshipReferenceId: "55555555-5555-4555-8555-555555555555",
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
