import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTutor: vi.fn(),
  getDatabase: vi.fn(),
  listTutors: vi.fn(),
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
    createTutor: mocks.createTutor,
    listTutors: mocks.listTutors,
  };
});

import { TUTOR_ERROR_CODES, TutorServiceError } from "@/features/tutors/tutor-service";

import { GET, POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

const database = {};
const tutor = {
  id: "11111111-1111-4111-8111-111111111111",
  formalName: "Benítez, Marina",
  firstName: "Marina",
  lastName: "Benítez",
  preferredDisplayName: null,
  institutionalIdentifier: "UTN-1",
  primaryCareer: {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Ingeniería en Sistemas",
    status: "ACTIVE" as const,
  },
  currentCycle: null,
  currentCycleLabel: null,
  scholarshipReference: null,
  subjectCount: 0,
  status: "ACTIVE" as const,
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
};

function requestWithBody(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/admin/tutors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Admin tutor collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue(database);
  });

  it("returns 401 before reading an unauthenticated list request", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const response = await GET(
      new Request("http://localhost/api/admin/tutors?status=invalid"),
    );

    expect(response.status).toBe(401);
    expect(mocks.listTutors).not.toHaveBeenCalled();
  });

  it("returns 403 to a Tutor and does not query the collection", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await GET(new Request("http://localhost/api/admin/tutors"));

    expect(response.status).toBe(403);
    expect(mocks.listTutors).not.toHaveBeenCalled();
  });

  it("parses filters on the server before listing", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.listTutors.mockResolvedValue([tutor]);

    const response = await GET(
      new Request(
        "http://localhost/api/admin/tutors?search=Marina&careerId=22222222-2222-4222-8222-222222222222&status=active&offset=5&limit=20",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tutors: [tutor] });
    expect(mocks.listTutors).toHaveBeenCalledWith(database, {
      search: "Marina",
      careerId: "22222222-2222-4222-8222-222222222222",
      status: "ACTIVE",
      offset: 5,
      limit: 20,
    });
  });

  it("rejects unknown query keys and malformed create input", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const invalidQuery = await GET(
      new Request("http://localhost/api/admin/tutors?unexpected=value"),
    );
    const invalidBody = await POST(
      requestWithBody({
        firstName: "Marina",
        lastName: "Benítez",
        primaryCareerId: "22222222-2222-4222-8222-222222222222",
        cycleId: "33333333-3333-4333-8333-333333333333",
        unexpected: true,
      }),
    );

    expect(invalidQuery.status).toBe(400);
    expect(invalidBody.status).toBe(400);
    expect(mocks.createTutor).not.toHaveBeenCalled();
  });

  it("creates through the Admin guard with bounded request context", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.createTutor.mockResolvedValue(tutor);

    const response = await POST(
      requestWithBody(
        {
          firstName: " Marina ",
          lastName: "Benítez",
          primaryCareerId: "22222222-2222-4222-8222-222222222222",
          cycleId: "33333333-3333-4333-8333-333333333333",
          subjectIds: [],
          scholarshipReferenceId: null,
        },
        {
          "x-request-id": "tutor-create-1",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        },
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ tutor });
    expect(mocks.createTutor).toHaveBeenCalledWith(
      database,
      {
        firstName: "Marina",
        lastName: "Benítez",
        primaryCareerId: "22222222-2222-4222-8222-222222222222",
        subjectIds: [],
        cycleId: "33333333-3333-4333-8333-333333333333",
        scholarshipReferenceId: null,
      },
      {
        actorId: admin.id,
        requestId: "tutor-create-1",
        ipAddress: "203.0.113.10",
      },
    );
  });

  it("maps domain conflicts without exposing persistence details", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.listTutors.mockRejectedValue(
      new TutorServiceError(
        TUTOR_ERROR_CODES.duplicateInstitutionalIdentifier,
        "private database message",
      ),
    );

    const response = await GET(new Request("http://localhost/api/admin/tutors"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: TUTOR_ERROR_CODES.duplicateInstitutionalIdentifier,
    });
  });
});
