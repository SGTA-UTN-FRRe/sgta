// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { colorTokens } from "./design-tokens";

describe("design preview color tokens", () => {
  it("lists every color declared in the runtime root registry", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const root = css.match(/:root\s*\{([^}]+)\}/)?.[1];

    expect(root, "Missing :root token registry").toBeDefined();

    const runtimeColors = [...root!.matchAll(/^\s*(--[\w-]+):\s*oklch\(/gm)]
      .map(([, name]) => name)
      .filter((name) => !name.startsWith("--shadow-"));

    expect(colorTokens.map(({ name }) => name)).toEqual(runtimeColors);
  });
});
