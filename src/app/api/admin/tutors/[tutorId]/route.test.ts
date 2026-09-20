import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getTutorDetail: vi.fn(),
  requireApiRole: vi.fn(),
  updateTutor: vi.fn(),
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
    getTutorDetail: mocks.getTutorDetail,
    updateTutor: mocks.updateTutor,
  };
});

import { TUTOR_ERROR_CODES, TutorServiceError } from "@/features/tutors/tutor-service";

import { GET, PATCH } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const tutorId = "11111111-1111-4111-8111-111111111111";
const careerId = "22222222-2222-4222-8222-222222222222";
const detail = {
  id: tutorId,
  formalName: "Benítez, Marina",
  firstName: "Marina",
  lastName: "Benítez",
  preferredDisplayName: null,
  institutionalIdentifier: null,
  primaryCareer: { id: careerId, name: "Sistemas", status: "ACTIVE" as const },
  currentCycle: null,
  currentCycleLabel: null,
  scholarshipReference: null,
  subjectCount: 0,
  status: "ACTIVE" as const,
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
  applicationAccount: null,
  subjects: [],
  memberships: [],
};

function context() {
  return { params: Promise.resolve({ tutorId }) };
}

function requestWithBody(body: unknown) {
  return new Request(`http://localhost/api/admin/tutors/${tutorId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin tutor detail routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 401 before reading a detail request", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const response = await GET(new Request("http://localhost"), context());

    expect(response.status).toBe(401);
    expect(mocks.getTutorDetail).not.toHaveBeenCalled();
  });

  it("returns a safe detail DTO for an enabled Admin", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getTutorDetail.mockResolvedValue(detail);

    const response = await GET(new Request("http://localhost"), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tutor: detail });
    expect(mocks.getTutorDetail).toHaveBeenCalledWith({}, tutorId);
  });

  it("maps not-found details to 404", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getTutorDetail.mockRejectedValue(
      new TutorServiceError(TUTOR_ERROR_CODES.tutorNotFound, "private message"),
    );

    const response = await GET(new Request("http://localhost"), context());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: TUTOR_ERROR_CODES.tutorNotFound,
    });
  });

  it("maps account ownership errors without exposing service messages", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.updateTutor.mockRejectedValue(
      new TutorServiceError(
        TUTOR_ERROR_CODES.applicationAccountAlreadyLinked,
        "private account ownership message",
      ),
    );

    const conflictResponse = await PATCH(
      requestWithBody({ applicationEmail: "tutor@example.com" }),
      context(),
    );

    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toEqual({
      error: TUTOR_ERROR_CODES.applicationAccountAlreadyLinked,
    });

    mocks.updateTutor.mockRejectedValue(
      new TutorServiceError(
        TUTOR_ERROR_CODES.applicationAccountNotFound,
        "private account lookup message",
      ),
    );
    const notFoundResponse = await PATCH(
      requestWithBody({ applicationEmail: "missing@example.com" }),
      context(),
    );

    expect(notFoundResponse.status).toBe(404);
    await expect(notFoundResponse.json()).resolves.toEqual({
      error: TUTOR_ERROR_CODES.applicationAccountNotFound,
    });
  });

  it("updates a tutor through the transactional service", async () => {
    const updated = { ...detail, firstName: "Marina Elena" };
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.updateTutor.mockResolvedValue(updated);

    const response = await PATCH(
      requestWithBody({ firstName: "Marina Elena" }),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tutor: updated });
    expect(mocks.updateTutor).toHaveBeenCalledWith(
      {},
      tutorId,
      { firstName: "Marina Elena" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
  });

  it("rejects malformed path identifiers and update bodies", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const invalidPath = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ tutorId: "not-a-uuid" }),
    });
    const invalidBody = await PATCH(
      requestWithBody({ unknown: true }),
      context(),
    );

    expect(invalidPath.status).toBe(400);
    expect(invalidBody.status).toBe(400);
    expect(mocks.updateTutor).not.toHaveBeenCalled();
  });
});
