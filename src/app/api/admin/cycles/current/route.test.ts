import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  getCurrentAdministrativeCycle: vi.fn(),
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/cycles/cycle-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/cycles/cycle-service")
  >();

  return {
    ...actual,
    getCurrentAdministrativeCycle: mocks.getCurrentAdministrativeCycle,
  };
});

import { GET } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

describe("Current Admin cycle route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a non-Admin request", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.getCurrentAdministrativeCycle).not.toHaveBeenCalled();
  });

  it("returns null when an Admin has no open cycle", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getCurrentAdministrativeCycle.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cycle: null });
  });
});
