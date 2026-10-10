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
const designValueMessage =
  "Use a registered design token instead of an arbitrary color, radius, shadow, font, type-size, tracking, or layering value.";
const arbitraryDesignClasses = [
  "text-[2.75rem]",
  "lg:leading-[1.08]",
  "tracking-[0.12em]",
  "bg-[#fff]",
  "rounded-[3px]",
  "shadow-[0_0_1px]",
  "font-[600]",
  "z-[70]",
  "z-50",
];

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

describe("arbitrary design value warning", () => {
  it("warns in JSX className strings, cn arguments, and template literals", async () => {
    const sources = [
      `export function ClassNames() {\n  return <>${arbitraryDesignClasses
        .map((className) => `<div className="${className}" />`)
        .join("\n")}\n  </>;\n}`,
      `declare function cn(...classes: string[]): string;\nexport function classes() {\n  return cn(${arbitraryDesignClasses
        .map((className) => `"${className}"`)
        .join(", ")});\n}`,
      `export function classes() {\n  return [${arbitraryDesignClasses
        .map((className) => `\`${className}\``)
        .join(", ")}];\n}`,
    ];

    for (const source of sources) {
      const [result] = await eslint.lintText(source, {
        filePath: "src/features/example/design-values.tsx",
      });
      const designWarnings = result.messages.filter(
        (message) => message.message === designValueMessage,
      );

      expect(designWarnings).toHaveLength(arbitraryDesignClasses.length);
      expect(designWarnings.map((message) => message.severity)).toEqual(
        Array.from({ length: arbitraryDesignClasses.length }, () => 1),
      );
    }
  });

  it("allows state variants, layout values, registered tokens, and primitives", async () => {
    const allowedClasses = [
      "data-[state=open]:bg-muted",
      "grid-cols-[1fr_auto]",
      "min-w-[40rem]",
      "z-overlay",
      "tracking-eyebrow",
    ];
    const source = `<div className="${allowedClasses.join(" ")}" />`;
    const [featureResult] = await eslint.lintText(source, {
      filePath: "src/features/example/example.tsx",
    });
    const [primitiveResult] = await eslint.lintText(
      `<div className="${arbitraryDesignClasses.join(" ")}" />`,
      { filePath: "src/components/ui/example.tsx" },
    );
    const [testResult] = await eslint.lintText(
      `<div className="${arbitraryDesignClasses.join(" ")}" />`,
      { filePath: "src/features/example/example.test.tsx" },
    );
    const [mockResult] = await eslint.lintText(
      `<div className="${arbitraryDesignClasses.join(" ")}" />`,
      { filePath: "src/mocks/example.tsx" },
    );

    expect(featureResult.messages).toEqual([]);
    expect(primitiveResult.messages).toEqual([]);
    expect(testResult.messages).toEqual([]);
    expect(mockResult.messages).toEqual([]);
  });
});
