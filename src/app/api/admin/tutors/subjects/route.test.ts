import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  listSubjectCoverage: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/tutors/tutor-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/tutors/tutor-service")
  >();

  return { ...actual, listSubjectCoverage: mocks.listSubjectCoverage };
});

import { GET } from "./route";

describe("Admin Subject coverage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 403 to a Tutor", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.listSubjectCoverage).not.toHaveBeenCalled();
  });

  it("returns derived coverage and its current-cycle context", async () => {
    const coverage = {
      currentCycle: null,
      subjects: [],
    };
    mocks.requireApiRole.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });
    mocks.listSubjectCoverage.mockResolvedValue(coverage);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ coverage });
    expect(mocks.listSubjectCoverage).toHaveBeenCalledWith({});
  });
});
