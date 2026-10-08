import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
