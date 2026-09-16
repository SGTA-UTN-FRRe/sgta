import { loadEnvConfig } from "@next/env";
import { z } from "zod";

import { createDatabaseHandle } from "../src/db/client-core";
import { provisionUser } from "../src/auth/provisioning";

loadEnvConfig(process.cwd());

const bootstrapArgumentsSchema = z.object({
  email: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

function readArgument(name: string) {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function readBootstrapArguments() {
  return bootstrapArgumentsSchema.parse({
    email: readArgument("email"),
    name: readArgument("name"),
  });
}

async function main() {
  const input = readBootstrapArguments();
  const database = createDatabaseHandle({ target: "application" });

  try {
    const provisionedUser = await provisionUser(
      database.db,
      {
        ...input,
        role: "ADMIN",
        enabled: true,
      },
      { source: "bootstrap" },
    );

    console.log(`Bootstrap Admin ready: ${provisionedUser.email}`);
  } finally {
    await database.close();
  }
}

main().catch((error: unknown) => {
  if (error instanceof z.ZodError) {
    console.error("Usage: pnpm auth:bootstrap-admin -- --email=name@example.com --name=Name");
    process.exitCode = 1;
    return;
  }

  console.error("Bootstrap Admin failed. Check the validated configuration and database availability.");
  process.exitCode = 1;
});
