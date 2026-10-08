// @vitest-environment node

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ overrideConfigFile: "eslint.config.mjs" });
const fixtureImport = 'import { hoursScreenData } from "@/mocks/hours.mock";';

describe("production fixture import restriction", () => {
  it("reports imports from src/mocks in production source", async () => {
    const [result] = await eslint.lintText(fixtureImport, {
      filePath: "src/features/example/example.tsx",
    });

    const restrictedImport = result.messages.find(
      (message) => message.ruleId === "no-restricted-imports",
    );

    expect(restrictedImport?.severity).toBe(2);
    expect(restrictedImport?.message).toContain(
      "Production code must not import test fixtures from src/mocks.",
    );
  });

  it("allows imports from src/mocks in test files", async () => {
    const [result] = await eslint.lintText(fixtureImport, {
      filePath: "src/features/example/example.test.tsx",
    });

    expect(
      result.messages.filter(
        (message) => message.ruleId === "no-restricted-imports",
      ),
    ).toEqual([]);
  });
});
