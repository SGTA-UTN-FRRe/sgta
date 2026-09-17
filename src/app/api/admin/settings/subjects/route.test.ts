import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSubject: vi.fn(),
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

  return {
    ...actual,
    createSubject: mocks.createSubject,
    listSubjects: mocks.listSubjects,
  };
});

import { GET, POST } from "./route";

function requestWithBody(body: unknown) {
  return new Request("http://localhost/api/admin/settings/subjects", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

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

  it("denies a Tutor before invoking subject mutations", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await POST(
      requestWithBody({
        careerId: "11111111-1111-4111-8111-111111111111",
        name: "Álgebra",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.createSubject).not.toHaveBeenCalled();
  });
});
