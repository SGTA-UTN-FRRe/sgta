// @vitest-environment node

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ overrideConfigFile: "eslint.config.mjs" });
const fixtureImport = 'import { hoursScreenData } from "@/mocks/hours.mock";';
const rawInteractiveElements = `
export default function RawElements() {
  return (
    <>
      <button />
      <input />
      <select />
      <textarea />
      <dialog />
    </>
  );
}
`;
const rawElementMessage =
  "Compose a primitive from src/components/ui instead of a raw interactive element.";

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

describe("raw interactive element warning", () => {
  it("warns on each restricted element in a feature view", async () => {
    const [result] = await eslint.lintText(rawInteractiveElements, {
      filePath: "src/features/example/raw.tsx",
    });

    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(5);
    expect(result.messages.map((message) => message.message)).toEqual(
      Array.from({ length: 5 }, () => rawElementMessage),
    );
  });

  it("allows raw elements inside the UI primitive directory", async () => {
    const [result] = await eslint.lintText(rawInteractiveElements, {
      filePath: "src/components/ui/raw.tsx",
    });

    expect(result.messages).toEqual([]);
  });

  it("allows a page that composes the Button primitive", async () => {
    const [result] = await eslint.lintText(
      `import { Button } from "@/components/ui/button";

export default function ExamplePage() {
  return <Button>Guardar</Button>;
}`,
      { filePath: "src/features/example/page.tsx" },
    );

    expect(result.messages).toEqual([]);
  });
});
