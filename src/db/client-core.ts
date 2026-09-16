import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import {
  getDatabaseUrl,
  type DatabaseTarget,
} from "@/config/env";

import { databaseSchema } from "./schema";

export type Database = NodePgDatabase<typeof databaseSchema>;

export type DatabaseHandleOptions = {
  connectionString?: string;
  target?: DatabaseTarget;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
};

export type DatabaseHandle = {
  db: Database;
  pool: Pool;
  close: () => Promise<void>;
};

export function createDatabaseHandle(
  options: DatabaseHandleOptions = {},
): DatabaseHandle {
  const connectionString =
    options.connectionString?.trim() ?? getDatabaseUrl(options.target);

  if (connectionString.length === 0) {
    throw new Error("A non-empty PostgreSQL connection string is required.");
  }

  const pool = new Pool({
    connectionString,
    max: options.max ?? 10,
    idleTimeoutMillis: options.idleTimeoutMillis,
    connectionTimeoutMillis: options.connectionTimeoutMillis,
  });
  const db = drizzle(pool, { schema: databaseSchema });
  let closed = false;

  return {
    db,
    pool,
    async close() {
      if (closed) {
        return;
      }

      closed = true;
      await pool.end();
    },
  };
}

const globalForDatabase = globalThis as typeof globalThis & {
  sgtaDatabaseHandle?: DatabaseHandle;
};

export function getDatabaseHandle() {
  if (globalForDatabase.sgtaDatabaseHandle === undefined) {
    globalForDatabase.sgtaDatabaseHandle = createDatabaseHandle();
  }

  return globalForDatabase.sgtaDatabaseHandle;
}

export function getDatabase() {
  return getDatabaseHandle().db;
}

export async function closeDatabase() {
  const handle = globalForDatabase.sgtaDatabaseHandle;
  if (handle !== undefined) {
    await handle.close();
    globalForDatabase.sgtaDatabaseHandle = undefined;
  }
}
