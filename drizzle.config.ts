import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { parseServerEnv } from "./src/config/env";

loadEnvConfig(process.cwd());

const env = parseServerEnv(process.env, { requireProduction: false });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Schema generation and migration checks do not connect to PostgreSQL.
    // Commands that execute migrations still fail when DATABASE_URL is absent.
    url: env.DATABASE_URL ?? "",
  },
});
