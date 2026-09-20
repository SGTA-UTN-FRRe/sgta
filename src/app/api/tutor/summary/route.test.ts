import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getTutorSelfServiceSummary: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/tutor-self-service/tutor-self-service-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/tutor-self-service/tutor-self-service-service")
  >();

  return {
    ...actual,
    getTutorSelfServiceSummary: mocks.getTutorSelfServiceSummary,
  };
});

import { GET, POST } from "./route";

const tutor = {
  id: "tutor-user-1",
  name: "Tutor",
  email: "tutor@example.com",
  role: "TUTOR" as const,
};

const database = {};
const summary = {
  state: "ready" as const,
  cycle: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Cycle 2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN" as const,
  },
  tutor: {
    displayName: "Lovelace, Ada",
    career: {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Engineering",
      status: "ACTIVE" as const,
    },
    status: "ACTIVE" as const,
    subjects: [],
  },
  membership: { cycleId: "11111111-1111-4111-8111-111111111111", scholarshipReference: null },
  balance: { signedBalanceMinutes: 0, state: "current" as const },
  nextDuty: null,
};

describe("Tutor summary route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue(database);
  });

  it("returns 401 and 403 before parsing or reading self-service data", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const unauthorized = await GET(
      new Request("http://localhost/api/tutor/summary?unexpected=true"),
    );
    expect(unauthorized.status).toBe(401);
    expect(mocks.getTutorSelfServiceSummary).not.toHaveBeenCalled();

    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );
    const forbidden = await GET(
      new Request("http://localhost/api/tutor/summary?unexpected=true"),
    );
    expect(forbidden.status).toBe(403);
    expect(mocks.getTutorSelfServiceSummary).not.toHaveBeenCalled();
  });

  it("rejects unknown query keys before invoking the read model", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);

    const response = await GET(
      new Request("http://localhost/api/tutor/summary?tutorId=other-tutor"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.getTutorSelfServiceSummary).not.toHaveBeenCalled();
  });

  it("returns the safe owner-scoped DTO with no-store headers", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);
    mocks.getTutorSelfServiceSummary.mockResolvedValue(summary);

    const response = await GET(new Request("http://localhost/api/tutor/summary"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(summary);
    expect(mocks.getTutorSelfServiceSummary).toHaveBeenCalledWith(
      database,
      tutor.id,
    );
    expect(JSON.stringify(summary)).not.toContain("email");
    expect(JSON.stringify(summary)).not.toContain("tutorId");
  });

  it("preserves bounded required-action states without exposing service details", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);
    mocks.getTutorSelfServiceSummary.mockResolvedValue({
      state: "required-action",
      reason: "ACCOUNT_NOT_LINKED",
    });

    const response = await GET(new Request("http://localhost/api/tutor/summary"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      state: "required-action",
      reason: "ACCOUNT_NOT_LINKED",
    });
  });

  it("rejects non-GET requests without reaching authorization or the service", async () => {
    const response = POST();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
    expect(mocks.requireApiRole).not.toHaveBeenCalled();
    expect(mocks.getTutorSelfServiceSummary).not.toHaveBeenCalled();
  });
});
