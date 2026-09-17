import path from "node:path";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll } from "vitest";

import {
  createDatabaseHandle,
  type Database,
  type DatabaseHandle,
} from "../../src/db/client-core";

export const POSTGRES_IMAGE = "postgres:16.4-alpine";

const databaseName = "sgta_integration";
const databaseUser = "sgta_test";
const databasePassword = "sgta_test_password";

let container: StartedPostgreSqlContainer | undefined;
let databaseHandle: DatabaseHandle | undefined;

async function stopIntegrationResources() {
  const currentHandle = databaseHandle;
  const currentContainer = container;
  databaseHandle = undefined;
  container = undefined;

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

  if (cleanupError !== undefined) {
    throw cleanupError;
  }
}

beforeAll(async () => {
  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase(databaseName)
      .withUsername(databaseUser)
      .withPassword(databasePassword)
      .start();

    databaseHandle = createDatabaseHandle({
      connectionString: container.getConnectionUri(),
      max: 5,
      connectionTimeoutMillis: 10_000,
    });

    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    await migrate(databaseHandle.db, { migrationsFolder });
    await migrate(databaseHandle.db, { migrationsFolder });
  } catch (error) {
    try {
      await stopIntegrationResources();
    } catch {
      // Preserve the startup or migration error as the actionable failure.
    }

    throw error;
  }
});

afterAll(async () => {
  await stopIntegrationResources();
});

export function getIntegrationDatabase(): Database {
  if (databaseHandle === undefined) {
    throw new Error("The integration database is not ready.");
  }

  return databaseHandle.db;
}

export function getIntegrationConnectionString() {
  if (container === undefined) {
    throw new Error("The integration PostgreSQL container is not ready.");
  }

  return container.getConnectionUri();
}
