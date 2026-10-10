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
  type Database,
} from "../../src/db/client-core";
import {
  assertProductionBuild,
  buildE2EApplicationEnv,
} from "../e2e/application-env";
import { E2E_AUTH_SECRET } from "../e2e/e2e-test-data";
import { startConsultationSourceFixture, type StartedConsultationSourceFixture } from "../e2e/consultation-source-fixture";

const POSTGRES_IMAGE = "postgres:16.4-alpine";
const E2E_DATABASE_NAME = "sgta_e2e";
const E2E_DATABASE_USER = "sgta_e2e";
const E2E_DATABASE_PASSWORD = "sgta_e2e_password";
let container: StartedPostgreSqlContainer | undefined;
let databaseHandle: DatabaseHandle | undefined;
let consultationSourceFixture: StartedConsultationSourceFixture | undefined;
let serverProcess: ReturnType<typeof spawn> | undefined;
let shuttingDown = false;

async function closeDatabase() {
  const currentHandle = databaseHandle;
  const currentContainer = container;
  const currentSourceFixture = consultationSourceFixture;
  databaseHandle = undefined;
  container = undefined;
  consultationSourceFixture = undefined;

  let cleanupError: unknown;
  try {
    await currentHandle?.close();
  } catch (error) {
    cleanupError = error;
  }
  try {
    await currentContainer?.stop();
  } catch (error) {
    cleanupError ??= error;
  }
  try {
    await currentSourceFixture?.close();
  } catch (error) {
    cleanupError ??= error;
  }
  if (cleanupError !== undefined) throw cleanupError;
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

async function main({ now, seed }: ApplicationServerOptions) {
  assertProductionBuild(process.cwd());

  consultationSourceFixture = await startConsultationSourceFixture();
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
  await seed(databaseHandle.db);

  const nextBin = path.resolve(
    process.cwd(),
    "node_modules/next/dist/bin/next",
  );
  const nextProcess = spawn(process.execPath, [nextBin, "start"], {
    env: buildE2EApplicationEnv(process.env, {
      NODE_ENV: "production",
      SGTA_E2E_MODE: "true",
      SGTA_E2E_NOW: now,
      DATABASE_URL: container.getConnectionUri(),
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      GOOGLE_CLIENT_ID: "e2e-google-client-id",
      GOOGLE_CLIENT_SECRET: "e2e-google-client-secret",
      GOOGLE_SHEETS_SPREADSHEET_ID: "e2e_consultation_source",
      GOOGLE_SHEETS_RANGE: "Consultations!A:I",
      GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL: "consultation-reader@example.test",
      GOOGLE_SHEETS_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----e2e-only-not-a-credential-----END PRIVATE KEY-----",
      GOOGLE_SHEETS_HEADER_MAP: JSON.stringify({
        career: "Career",
        studentFirstName: "Student first name",
        studentLastName: "Student last name",
        consultationDate: "Consultation date",
        tutor: "Tutor",
        academicStage: "Academic stage",
        modality: "Modality",
        topic: "Topic",
        contact: "Contact",
      }),
      SGTA_E2E_CONSULTATION_SOURCE_URL: consultationSourceFixture.apiBaseUrl,
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: "3000",
    }),
    stdio: "inherit",
  });
  serverProcess = nextProcess;

  nextProcess.once("exit", (code) => {
    void shutdown(code ?? 1);
  });

  process.once("SIGINT", () => void shutdown(130));
  process.once("SIGTERM", () => void shutdown(143));
}

export type ApplicationServerOptions = {
  now: string;
  seed: (database: Database) => Promise<void>;
};

export async function runApplicationServer(options: ApplicationServerOptions) {
  try {
    await main(options);
  } catch (error) {
    console.error(error);
    await shutdown(1);
  }
}
