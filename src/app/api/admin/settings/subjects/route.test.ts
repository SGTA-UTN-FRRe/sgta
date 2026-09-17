import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  listSubjects: vi.fn(),
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

  return { ...actual, listSubjects: mocks.listSubjects };
});

import { GET } from "./route";

describe("Admin Subject reference list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("rejects malformed catalog query values", async () => {
    mocks.requireApiRole.mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/admin/settings/subjects?activeCareerOnly=maybe",
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.listSubjects).not.toHaveBeenCalled();
  });
});
