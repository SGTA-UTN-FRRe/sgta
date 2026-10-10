import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const rawInteractiveElementNames = ["button", "input", "select", "textarea", "dialog"];
const rawInteractiveElementMessage =
  "Compose a primitive from src/components/ui instead of a raw interactive element.";
const designValueMessage =
  "Use a registered design token instead of an arbitrary color, radius, shadow, font, type-size, tracking, or layering value.";
const arbitraryDesignValuePattern = String.raw`(^|\s)([a-z0-9-]+:)*-?(text|bg|border|ring|outline|fill|stroke|shadow|rounded|font|tracking|leading|z|from|via|to|decoration|divide|placeholder|caret|accent)(-[a-z]+)?-\[`;
const numericLayerPattern = String.raw`(^|\s)([a-z0-9-]+:)*-?z-[0-9]`;
const designValueSelectors = [
  `Literal[value=/${arbitraryDesignValuePattern}/]`,
  `TemplateElement[value.raw=/${arbitraryDesignValuePattern}/]`,
  `Literal[value=/${numericLayerPattern}/]`,
  `TemplateElement[value.raw=/${numericLayerPattern}/]`,
].map((selector) => ({ selector, message: designValueMessage }));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/mocks/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/mocks", "@/mocks/*"],
              message: "Production code must not import test fixtures from src/mocks.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["tests/e2e/**/*.ts"],
    ignores: ["tests/e2e/fixtures.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@playwright/test",
              importNames: ["test"],
              message: "Import test from ./fixtures so navigation waits for hydration.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: "Wait for a condition, not a duration.",
        },
        {
          selector: "CallExpression[callee.object.name='test'][callee.property.name='setTimeout']",
          message: "Test budgets live in playwright.config.ts.",
        },
        {
          selector: "MemberExpression[object.name=/^(test|describe)$/][property.name='only']",
          message: "Focused tests must not be committed.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name=/^(it|test)$/][arguments.length=3]",
          message: "Test budgets live in vitest.config.ts.",
        },
        {
          selector: "CallExpression[callee.name=/^(waitFor|waitForElementToBeRemoved)$/] > ObjectExpression > Property[key.name='timeout']",
          message: "Async budgets live in src/test/setup.ts.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**", "src/mocks/**", "**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        ...rawInteractiveElementNames.map((name) => ({
          selector: `JSXOpeningElement[name.type='JSXIdentifier'][name.name='${name}']`,
          message: rawInteractiveElementMessage,
        })),
        ...designValueSelectors,
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
