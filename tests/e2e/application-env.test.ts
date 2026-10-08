// @vitest-environment node

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertProductionBuild,
  buildE2EApplicationEnv,
  E2E_PASSTHROUGH_ENV_KEYS,
} from "./application-env";

describe("E2E application environment", () => {
  it("passes only allowlisted host values and explicit application values", () => {
    const environment = buildE2EApplicationEnv(
      {
        NODE_ENV: "test",
        PATH: "host-path",
        DATABASE_URL: "postgres://host/database",
        TEST_DATABASE_URL: "postgres://host/test",
        GOOGLE_CLIENT_SECRET: "host-google-secret",
        BETTER_AUTH_SECRET: "host-auth-secret",
        UNRELATED_VALUE: "host-only",
      },
      {
        NODE_ENV: "production",
        DATABASE_URL: "postgres://e2e/database",
        GOOGLE_CLIENT_SECRET: "e2e-google-secret",
        BETTER_AUTH_SECRET: "e2e-auth-secret",
      },
    );

    expect(E2E_PASSTHROUGH_ENV_KEYS).toEqual(["PATH"]);
    expect(environment).toEqual({
      NODE_ENV: "production",
      PATH: "host-path",
      DATABASE_URL: "postgres://e2e/database",
      GOOGLE_CLIENT_SECRET: "e2e-google-secret",
      BETTER_AUTH_SECRET: "e2e-auth-secret",
    });
  });

  it("lets explicit values override allowlisted host values", () => {
    expect(
      buildE2EApplicationEnv(
        { NODE_ENV: "test", PATH: "host-path" },
        { NODE_ENV: "production", PATH: "explicit-path" },
      ),
    ).toEqual({ NODE_ENV: "production", PATH: "explicit-path" });
  });

  it("requires a production build identifier", async () => {
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), "sgta-e2e-build-"));

    try {
      expect(() => assertProductionBuild(projectRoot)).toThrow(
        "The E2E runner requires a production build. Run `corepack pnpm build` before `corepack pnpm test:e2e`.",
      );

      const buildDirectory = path.join(projectRoot, ".next");
      await mkdir(buildDirectory);
      await writeFile(path.join(buildDirectory, "BUILD_ID"), "test-build");

      expect(() => assertProductionBuild(projectRoot)).not.toThrow();
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
