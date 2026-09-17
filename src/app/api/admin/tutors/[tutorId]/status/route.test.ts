import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
  transitionTutorStatus: vi.fn(),
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

  return { ...actual, transitionTutorStatus: mocks.transitionTutorStatus };
});

import { PATCH } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const tutorId = "11111111-1111-4111-8111-111111111111";

function context() {
  return { params: Promise.resolve({ tutorId }) };
}

function requestWithBody(body: unknown) {
  return new Request(`http://localhost/api/admin/tutors/${tutorId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin tutor status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor before parsing a status mutation", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await PATCH(requestWithBody({ status: "INACTIVE" }), context());

    expect(response.status).toBe(403);
    expect(mocks.transitionTutorStatus).not.toHaveBeenCalled();
  });

  it("transitions status with actor attribution", async () => {
    const tutor = { id: tutorId, status: "INACTIVE" };
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.transitionTutorStatus.mockResolvedValue(tutor);

    const response = await PATCH(
      requestWithBody({ status: "INACTIVE" }),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tutor });
    expect(mocks.transitionTutorStatus).toHaveBeenCalledWith(
      {},
      tutorId,
      { status: "INACTIVE" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
  });

  it("rejects an invalid status value at the route boundary", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const response = await PATCH(requestWithBody({ status: "PAUSED" }), context());

    expect(response.status).toBe(400);
    expect(mocks.transitionTutorStatus).not.toHaveBeenCalled();
  });
});
