import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizeEmail,
} from "./identity";
import {
  parseProvisionUserInput,
  toSafeProvisionedUser,
} from "./provisioning";

describe("user provisioning", () => {
  it("normalizes emails before persistence", () => {
    expect(normalizeEmail("  Tutor@Example.COM ")).toBe("tutor@example.com");
    expect(
      parseProvisionUserInput({
        email: "  Tutor@Example.COM ",
        name: "  Tutor Example  ",
        role: "TUTOR",
        enabled: true,
      }),
    ).toEqual({
      email: "tutor@example.com",
      name: "Tutor Example",
      role: "TUTOR",
      enabled: true,
    });
  });

  it("requires explicit role and enabled state", () => {
    expect(() =>
      parseProvisionUserInput({
        email: "admin@example.com",
        name: "Admin",
      } as never),
    ).toThrow();
  });

  it("returns only safe user fields", () => {
    expect(
      toSafeProvisionedUser({
        id: "user-1",
        name: "Admin",
        email: "admin@example.com",
        role: "ADMIN",
        enabled: true,
      }),
    ).toEqual({
      id: "user-1",
      name: "Admin",
      email: "admin@example.com",
      role: "ADMIN",
      enabled: true,
    });
  });
});
