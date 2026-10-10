import { mkdir } from "node:fs/promises";
import { test } from "../e2e/fixtures";
import { prepareCapture } from "./capture";
import { screenshotRoutes } from "./routes";

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

for (const route of screenshotRoutes) {
  for (const viewport of viewports) {
    test(`[${route.slug}] ${viewport.width}`, async ({ context, page }) => {
      await page.setViewportSize(viewport);
      await prepareCapture(context, page, route);
      const directory = `test-results/review-screenshots/${route.slug}`;
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: `${directory}/${viewport.width}.png`, fullPage: true, animations: "disabled" });
    });
  }
}
