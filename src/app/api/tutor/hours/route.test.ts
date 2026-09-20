import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getTutorSelfServiceHours: vi.fn(),
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
    getTutorSelfServiceHours: mocks.getTutorSelfServiceHours,
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
const hours = {
  state: "ready" as const,
  cycle: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Cycle 2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN" as const,
  },
  balance: { signedBalanceMinutes: -30, state: "owes" as const },
  movements: [],
  historyComplete: true as const,
};

describe("Tutor hours route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue(database);
  });

  it("returns 401 and 403 before reading owner hours", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );
    const unauthorized = await GET(
      new Request("http://localhost/api/tutor/hours?tutorId=other"),
    );
    expect(unauthorized.status).toBe(401);
    expect(mocks.getTutorSelfServiceHours).not.toHaveBeenCalled();

    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );
    const forbidden = await GET(new Request("http://localhost/api/tutor/hours"));
    expect(forbidden.status).toBe(403);
    expect(mocks.getTutorSelfServiceHours).not.toHaveBeenCalled();
  });

  it("rejects ownership overrides and returns the complete safe DTO", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);
    const invalid = await GET(
      new Request("http://localhost/api/tutor/hours?tutorId=other"),
    );
    expect(invalid.status).toBe(400);
    expect(mocks.getTutorSelfServiceHours).not.toHaveBeenCalled();

    mocks.getTutorSelfServiceHours.mockResolvedValue(hours);
    const response = await GET(new Request("http://localhost/api/tutor/hours"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(hours);
    expect(mocks.getTutorSelfServiceHours).toHaveBeenCalledWith(
      database,
      tutor.id,
      {},
    );
  });

  it("returns a bounded method error and never invokes a mutation service", async () => {
    const response = POST();

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      error: "method_not_allowed",
    });
    expect(mocks.getTutorSelfServiceHours).not.toHaveBeenCalled();
  });
});
