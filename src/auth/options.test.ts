import { describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/config/env";
import type { Database } from "@/db/client-core";

import { AUTH_ERROR_CODES } from "./identity";
import { createAuthOptions } from "./options";

const environment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://localhost/sgta",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "12345678901234567890123456789012",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  GOOGLE_HOSTED_DOMAIN: undefined,
  TEST_DATABASE_URL: "postgresql://localhost/sgta_test",
} satisfies ServerEnv;

function createSelectMock(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { db: { select } as unknown as Database, select };
}

describe("Better Auth options", () => {
  it("configures Google-only authentication with signup disabled", () => {
    const { db } = createSelectMock([]);
    const options = createAuthOptions(environment, db);
    const google = options.socialProviders?.google;

    expect(google).toMatchObject({
      disableImplicitSignUp: true,
      disableSignUp: true,
      clientId: environment.GOOGLE_CLIENT_ID,
      clientSecret: environment.GOOGLE_CLIENT_SECRET,
    });
    expect(options.emailAndPassword).toMatchObject({
      enabled: false,
      disableSignUp: true,
    });
    expect(options.disabledPaths).toEqual(["/sign-in/email", "/sign-up/email"]);
  });

  it("keeps role and enabled server-owned", () => {
    const { db } = createSelectMock([]);
    const options = createAuthOptions(environment, db);
    const fields = options.user?.additionalFields;

    expect(fields?.role).toMatchObject({
      input: false,
      returned: true,
      defaultValue: "TUTOR",
    });
    expect(fields?.enabled).toMatchObject({
      input: false,
      returned: true,
      defaultValue: false,
    });
  });

  it("rejects an identity that is not an enabled provisioned user", async () => {
    const { db } = createSelectMock([]);
    const options = createAuthOptions(environment, db);
    const result = await options.user?.validateUserInfo?.(
      {
        user: { email: "unknown@example.com" },
        source: {
          action: "create-user",
          method: "oauth",
          oauth: { providerId: "google" },
        },
      },
    );

    expect(result?.error).toBe(AUTH_ERROR_CODES.identityNotProvisioned);
  });

  it("allows an enabled provisioned identity through the session guard", async () => {
    const { db } = createSelectMock([
      {
        id: "user-1",
        email: "admin@example.com",
        role: "ADMIN",
        enabled: true,
      },
    ]);
    const options = createAuthOptions(environment, db);
    const result = await options.databaseHooks?.session?.create?.before?.(
      { userId: "user-1" } as never,
    );

    expect(result).toBe(true);
  });

  it("invalidates a session when its identity is no longer enabled", async () => {
    const { db } = createSelectMock([]);
    const options = createAuthOptions(environment, db);
    const deleteSession = vi.fn().mockResolvedValue(undefined);
    const afterHook = options.hooks?.after;

    const result = await afterHook?.({
      path: "/get-session",
      returnHeaders: true,
      context: {
        returned: {
          session: { token: "session-1" },
          user: { id: "user-1" },
        },
        internalAdapter: { deleteSession },
      },
    } as never);

    expect(deleteSession).toHaveBeenCalledWith("session-1");
    expect(result).toMatchObject({ response: null });
  });

  it("blocks role and enabled changes in Better Auth user updates", async () => {
    const { db } = createSelectMock([]);
    const options = createAuthOptions(environment, db);
    const result = await options.databaseHooks?.user?.update?.before?.(
      { enabled: true } as never,
    );

    expect(result).toBe(false);
  });
});
