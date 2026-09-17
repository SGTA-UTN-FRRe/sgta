import { describe, expect, it } from "vitest";

import {
  loginStateFromAuthError,
  loginStateFromAuthErrorCode,
} from "./login-auth";

describe("login authentication state mapping", () => {
  it("maps safe access failures to permission denied", () => {
    expect(loginStateFromAuthErrorCode("identity_not_provisioned")).toBe(
      "permission-denied",
    );
    expect(loginStateFromAuthErrorCode("signup_disabled")).toBe(
      "permission-denied",
    );
  });

  it("keeps unknown failures technical", () => {
    expect(loginStateFromAuthErrorCode("internal_server_error")).toBe("error");
    expect(loginStateFromAuthError(undefined)).toBe("default");
  });

  it("reads Better Auth error envelopes without exposing their messages", () => {
    expect(
      loginStateFromAuthError({
        error: { body: { code: "provider_email_unverified" } },
      }),
    ).toBe("permission-denied");
  });
});
