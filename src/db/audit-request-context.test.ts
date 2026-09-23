import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAuditRequestContext } from "./audit-request-context";

describe("audit request context", () => {
  it("retains opaque request IDs and valid proxy IPs", () => {
    const request = new Request("http://localhost/api/admin/cycles", {
      headers: {
        "x-request-id": "admin-cycle-close-1",
        "x-forwarded-for": "203.0.113.12, 10.0.0.1",
      },
    });

    expect(getAuditRequestContext(request)).toEqual({
      requestId: "admin-cycle-close-1",
      ipAddress: "203.0.113.12",
    });
  });

  it("drops sensitive or malformed request metadata and falls back to a valid IP", () => {
    const request = new Request("http://localhost/api/admin/cycles", {
      headers: {
        "x-request-id": "student@example.test",
        "x-forwarded-for": "authorization-token, 10.0.0.1",
        "x-real-ip": "2001:db8::1",
      },
    });

    expect(getAuditRequestContext(request)).toEqual({ ipAddress: "2001:db8::1" });
  });

  it.each([
    "Bearer.secret-token-value",
    "basic.credentials",
    "sk_live_privatevalue",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature",
    "1234567890",
  ])("drops credential-like request ID %s", (requestId) => {
    const request = new Request("http://localhost/api/admin/cycles", {
      headers: { "x-request-id": requestId },
    });

    expect(getAuditRequestContext(request)).toEqual({});
  });
});
