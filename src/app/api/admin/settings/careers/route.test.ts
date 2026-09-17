import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCareer: vi.fn(),
  getDatabase: vi.fn(),
  listCareers: vi.fn(),
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
    createCareer: mocks.createCareer,
    listCareers: mocks.listCareers,
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

function requestWithBody(body: unknown) {
  return new Request("http://localhost/api/admin/settings/careers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin Career reference routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor from reference-data reads and mutations", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const readResponse = await GET(new Request("http://localhost"));
    const writeResponse = await POST(requestWithBody({ name: "Sistemas" }));

    expect(readResponse.status).toBe(403);
    expect(writeResponse.status).toBe(403);
    expect(mocks.listCareers).not.toHaveBeenCalled();
    expect(mocks.createCareer).not.toHaveBeenCalled();
  });

  it("lists careers with a server-parsed status filter", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.listCareers.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/admin/settings/careers?status=active"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ careers: [] });
    expect(mocks.listCareers).toHaveBeenCalledWith({}, "ACTIVE");
  });

  it("creates a career and maps duplicate conflicts to 409", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.createCareer.mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Sistemas",
      status: "ACTIVE",
    });

    const successResponse = await POST(requestWithBody({ name: " Sistemas " }));

    expect(successResponse.status).toBe(201);
    expect(mocks.createCareer).toHaveBeenCalledWith(
      {},
      { name: "Sistemas" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );

    mocks.createCareer.mockRejectedValue(
      new TutorServiceError(TUTOR_ERROR_CODES.duplicateCareerName, "private"),
    );
    const conflictResponse = await POST(requestWithBody({ name: "Sistemas" }));

    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toEqual({
      error: TUTOR_ERROR_CODES.duplicateCareerName,
    });
  });
});
