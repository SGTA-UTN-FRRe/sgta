import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

const wcag22AaTags = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

export async function collectSeriousAccessibilityViolations(
  page: Page,
  state: string,
) {
  const results = await new AxeBuilder({ page })
    .withTags(wcag22AaTags)
    .analyze();

  return results.violations
    .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => `  ${node.target.join(", ")}: ${node.failureSummary ?? violation.help}`)
        .join("\n");

      return `${state}: ${violation.impact} ${violation.id} — ${violation.help}\n${nodes}`;
    });
}
