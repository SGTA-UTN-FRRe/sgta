import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 3125;
const BASE_URL = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(process.cwd(), "local-docs", "tmp", "screenshots");
const REVIEW_DIR = path.join(process.cwd(), "test-results", "review-screenshots");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
];

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start at ${url} within ${timeout}ms`);
}

async function capture() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(REVIEW_DIR, { recursive: true });

  console.log(`Starting Next.js development server on port ${PORT}...`);
  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  try {
    await waitForServer(`${BASE_URL}/design-preview`);
    console.log("Server is ready!");

    const browser = await chromium.launch({ headless: true });

    // 1. Capture public pages across resolutions
    const publicPages = [
      { slug: "login", path: "/login" },
      { slug: "forbidden", path: "/forbidden" },
      { slug: "not-found", path: "/_not-found" },
    ];

    for (const pageInfo of publicPages) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);

        const outPath = path.join(OUTPUT_DIR, `${pageInfo.slug}-${vp.name}-${vp.width}x${vp.height}.png`);
        const reviewPath = path.join(REVIEW_DIR, pageInfo.slug, `${vp.width}.png`);
        fs.mkdirSync(path.dirname(reviewPath), { recursive: true });

        await page.screenshot({ path: outPath, fullPage: true });
        await page.screenshot({ path: reviewPath, fullPage: true });
        console.log(`Captured ${pageInfo.slug} at ${vp.width}x${vp.height}`);
        await page.close();
      }
    }

    // 2. Capture Design Preview (Admin & Tutor shell layout integration)
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${BASE_URL}/design-preview`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);

      const outPath = path.join(OUTPUT_DIR, `shell-design-preview-${vp.name}-${vp.width}x${vp.height}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Captured shell-design-preview at ${vp.width}x${vp.height}`);

      // Capture isolated Shell section
      const shellSection = page.locator('section[aria-labelledby="shell-heading"]');
      if (await shellSection.count() > 0) {
        const sectionPath = path.join(OUTPUT_DIR, `shell-identity-${vp.name}-${vp.width}x${vp.height}.png`);
        await shellSection.screenshot({ path: sectionPath });
        console.log(`Captured shell-identity section at ${vp.width}x${vp.height}`);
      }
      await page.close();
    }

    // 3. Capture Favicon / Mark at 16px and 32px
    for (const size of [16, 32]) {
      const iconPage = await browser.newPage({ viewport: { width: size * 4, height: size * 4 } });
      await iconPage.setContent(`
        <!DOCTYPE html>
        <html>
          <body style="margin:0; padding:8px; display:flex; align-items:center; justify-content:center; background:#0B172E;">
            <img src="${BASE_URL}/icon.svg" width="${size}" height="${size}" style="display:block;" />
          </body>
        </html>
      `);
      const iconPath = path.join(OUTPUT_DIR, `favicon-${size}px.png`);
      await iconPage.screenshot({ path: iconPath });
      console.log(`Captured favicon at ${size}px`);
      await iconPage.close();
    }

    await browser.close();
    console.log("=== All screenshots captured successfully! ===");
  } finally {
    server.kill("SIGINT");
  }
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});

