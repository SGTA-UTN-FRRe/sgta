// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const design = readFileSync("design/PROJECT-DESIGN.md", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");

function declarations(source: string, selector: string) {
  const start = source.indexOf(`${selector} {`);
  expect(start, `Missing ${selector} registry`).toBeGreaterThanOrEqual(0);
  const block = source.slice(start, source.indexOf("}", start));
  const entries = [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)];
  expect(entries.length).toBeGreaterThan(0);
  const values = Object.fromEntries(entries.map(([, name, value]) => [name, value.trim()]));
  expect(Object.keys(values)).toHaveLength(entries.length);
  return values;
}

function luminance(color: string) {
  const [lightness, chroma, hue] = color.match(/[\d.]+/g)!.map(Number);
  const a = chroma * Math.cos(hue * Math.PI / 180);
  const b = chroma * Math.sin(hue * Math.PI / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const [red, green, blue] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.max(0, Math.min(1, channel)));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

describe("canonical design token registry", () => {
  for (const selector of [":root", "@theme", "@theme inline"]) {
    it(`keeps ${selector} identical in design and runtime`, () => {
      expect(declarations(css, selector)).toEqual(declarations(design, selector));
    });
  }

  it("defines every exposed color in oklch with no legacy color values", () => {
    const root = declarations(css, ":root");
    const theme = declarations(css, "@theme inline");
    const colors = Object.entries(theme).filter(([name]) => name.startsWith("--color-"));
    expect(colors.length).toBeGreaterThan(0);
    for (const [, value] of colors) {
      const token = value.match(/^var\((--[\w-]+)\)$/)?.[1];
      expect(token).toBeDefined();
      expect(root[token!]).toMatch(/^oklch\(\d\.\d{3} \d\.\d{3} \d+\.\d{3}\)$/);
    }
    expect(css).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(/i);
  });

  it("meets each documented contrast minimum using the rounded runtime values", () => {
    const root = declarations(css, ":root");
    const pairs = [...design.matchAll(/\| `(--[\w-]+)` \| `(--[\w-]+)` \| ([\d.]+):1 \| ([\d.]+):1 \|/g)];
    expect(pairs.length).toBeGreaterThan(30);
    for (const [, foreground, background, measured, minimum] of pairs) {
      const a = luminance(root[foreground]);
      const b = luminance(root[background]);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      expect(ratio, `${foreground} on ${background}`).toBeGreaterThanOrEqual(Number(minimum));
      expect(ratio).toBeCloseTo(Number(measured), 2);
    }
  });

  it("keeps career hues saturated and distinct from brand orange and destructive red", () => {
    const root = declarations(css, ":root");
    const careers = Object.keys(root).filter((key) => /^--career-(?!.*foreground)/.test(key));
    expect(careers).toHaveLength(8);
    for (const token of careers) {
      const [, chroma, hue] = root[token].match(/[\d.]+/g)!.map(Number);
      if (token !== "--career-graphite") expect(chroma).toBeGreaterThanOrEqual(0.12);
      for (const reserved of ["--faro", "--destructive"]) {
        const reservedHue = Number(root[reserved].match(/[\d.]+/g)![2]);
        const delta = Math.abs(hue - reservedHue);
        expect(Math.min(delta, 360 - delta), `${token} vs ${reserved}`).toBeGreaterThanOrEqual(25);
      }
    }
  });
});
