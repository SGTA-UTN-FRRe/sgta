import { existsSync } from "node:fs";
import path from "node:path";

export const E2E_PASSTHROUGH_ENV_KEYS = ["PATH"] as const;

const productionBuildError =
  "The E2E runner requires a production build. Run `corepack pnpm build` before `corepack pnpm test:e2e`.";

export function buildE2EApplicationEnv(
  source: NodeJS.ProcessEnv,
  values: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const passthrough: Record<string, string> = {};

  for (const key of E2E_PASSTHROUGH_ENV_KEYS) {
    const value = source[key];
    if (value !== undefined) {
      passthrough[key] = value;
    }
  }

  return { ...passthrough, ...values };
}

export function assertProductionBuild(projectRoot: string) {
  if (!existsSync(path.join(projectRoot, ".next", "BUILD_ID"))) {
    throw new Error(productionBuildError);
  }
}
