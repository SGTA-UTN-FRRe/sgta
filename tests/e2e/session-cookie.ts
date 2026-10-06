import type { BrowserContext } from "@playwright/test";

export async function addE2ESessionCookie(
  context: BrowserContext,
  signedToken: string,
) {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: signedToken,
      url: "http://localhost:3000",
    },
  ]);
}
