import { mkdir } from "node:fs/promises";
import { test } from "../e2e/fixtures";
import { prepareCapture } from "./capture";
import { screenshotRoutes } from "./routes";

for (const route of screenshotRoutes.filter((route) => route.readme !== null)) {
  test(`[${route.slug}] README`, async ({ context, page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareCapture(context, page, route);
    await mkdir("docs/screenshots", { recursive: true });
    await page.screenshot({ path: `docs/screenshots/${route.readme}`, fullPage: false, animations: "disabled" });
  });
}
