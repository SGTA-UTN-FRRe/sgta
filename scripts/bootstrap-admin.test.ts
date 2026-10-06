// @vitest-environment node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { expect, it } from "vitest";

import packageJson from "../package.json";

const require = createRequire(import.meta.url);

it("starts the Admin bootstrap CLI and rejects missing arguments before database access", () => {
  const [, ...arguments_] = packageJson.scripts["auth:bootstrap-admin"].split(" ");
  const result = spawnSync(
    process.execPath,
    [require.resolve("tsx/cli"), ...arguments_],
    {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "" },
      encoding: "utf8",
      timeout: 15_000,
    },
  );

  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Usage: pnpm auth:bootstrap-admin");
  expect(result.stderr).not.toContain("Bootstrap Admin failed");
});
