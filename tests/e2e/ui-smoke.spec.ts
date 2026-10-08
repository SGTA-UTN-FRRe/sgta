import { expect, test } from "./fixtures";

import { collectSeriousAccessibilityViolations } from "./accessibility-helpers";
import { expectFocusOutline } from "./keyboard-helpers";

const requiredSecurityHeaders = {
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
} as const;

function expectSecurityHeaders(headers: Record<string, string>) {
  for (const [name, value] of Object.entries(requiredSecurityHeaders)) {
    expect(headers[name]).toBe(value);
  }
}

test.describe("UI smoke journeys", () => {
  test("keeps the design preview out of production", async ({ request }) => {
    const response = await request.get("/design-preview");

    expect(response.status()).toBe(404);
  });

  test("applies security headers to pages and Google sign-in callbacks", async ({
    request,
  }) => {
    const loginResponse = await request.get("/login");
    expect(loginResponse.status()).toBe(200);
    expectSecurityHeaders(loginResponse.headers());

    const adminResponse = await request.get("/admin", { maxRedirects: 0 });
    expect(adminResponse.status()).toBe(307);
    expectSecurityHeaders(adminResponse.headers());

    const signInResponse = await request.post("/api/auth/sign-in/social", {
      data: {
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login",
      },
    });
    expect(signInResponse.status()).toBe(200);
    expectSecurityHeaders(signInResponse.headers());

    const signInResult = (await signInResponse.json()) as {
      url?: string;
    };
    expect(signInResult.url).toBeDefined();

    const authorizationUrl = new URL(signInResult.url!);
    expect(authorizationUrl.hostname).toBe("accounts.google.com");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback/google",
    );

    const state = authorizationUrl.searchParams.get("state");
    expect(state).toBeTruthy();

    const callbackResponse = await request.get(
      `/api/auth/callback/google?error=access_denied&state=${encodeURIComponent(state!)}`,
      { maxRedirects: 0 },
    );
    expect(callbackResponse.status()).toBe(302);
    expectSecurityHeaders(callbackResponse.headers());
    expect(callbackResponse.headers().location).toBe(
      "/login?error=access_denied",
    );
  });

  test("redirects the root route to login", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("renders the institutional login route", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar/ })).toBeVisible();
    const accessibilityViolations = await collectSeriousAccessibilityViolations(
      page,
      "Login default state",
    );
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });

  test("renders an accessible missing-page state at supported widths and returns to login", async ({ page }) => {
    const accessibilityViolations: string[] = [];
    for (const width of [390, 900, 1440]) {
      await page.setViewportSize({ height: 900, width });
      const response = await page.goto("/missing-page");
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "No encontramos esa página" })).toBeVisible();

      const home = page.getByRole("link", { name: "Volver al inicio" });
      await page.keyboard.press("Tab");
      await expect(home).toBeFocused();
      await expectFocusOutline(home);
      const pageWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      }));
      expect(pageWidths.scroll).toBeLessThanOrEqual(pageWidths.client);
      accessibilityViolations.push(
        ...(await collectSeriousAccessibilityViolations(page, `Missing page at ${width}px`)),
      );
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/login$/);
    }
    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });

  test("announces login errors and permission denial at supported widths", async ({
    page,
  }) => {
    const accessibilityViolations: string[] = [];
    for (const width of [390, 900, 1440]) {
      await page.setViewportSize({ height: 900, width });
      await page.goto("/login?error=internal_server_error");

      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "No se pudo iniciar sesión",
      );
      await page.keyboard.press("Tab");
      const retry = page.getByRole("button", { name: "Reintentar" });
      await expect(retry).toBeFocused();
      await expectFocusOutline(retry);

      const errorWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      }));
      expect(errorWidths.scroll).toBeLessThanOrEqual(errorWidths.client);
      accessibilityViolations.push(
        ...(await collectSeriousAccessibilityViolations(
          page,
          `Login technical-error state at ${width}px`,
        )),
      );

      await page.goto("/login?error=signup_disabled");
      await expect(page.getByRole("status")).toContainText(
        "Esta cuenta no está habilitada en SGTA",
      );
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", { name: "Continuar con Google" }),
      ).toBeFocused();

      const deniedWidths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      }));
      expect(deniedWidths.scroll).toBeLessThanOrEqual(deniedWidths.client);
      accessibilityViolations.push(
        ...(await collectSeriousAccessibilityViolations(
          page,
          `Login permission-denied state at ${width}px`,
        )),
      );
    }

    expect(accessibilityViolations, accessibilityViolations.join("\n\n")).toEqual([]);
  });

  test("redirects unauthenticated admin routes to login", async ({ page }) => {
    for (const route of [
      "/admin",
      "/admin/tutors",
      "/admin/tutors/subjects",
      "/admin/settings",
      "/admin/hours",
      "/admin/hours/movements",
      "/admin/schedules",
      "/admin/consultations",
      "/admin/reports",
    ]) {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("redirects unauthenticated tutor routes to login", async ({ page }) => {
    for (const route of ["/tutor", "/tutor/schedule", "/tutor/hours"]) {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });
});
