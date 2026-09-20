import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getTutorSelfServiceSchedule: vi.fn(),
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
    getTutorSelfServiceSchedule: mocks.getTutorSelfServiceSchedule,
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
const schedule = {
  state: "ready" as const,
  cycle: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Cycle 2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN" as const,
  },
  window: {
    mode: "selected" as const,
    anchorDate: "2027-04-05",
    startDate: "2027-04-05",
    endDate: "2027-04-11",
  },
  effectivePlan: null,
  days: [],
  nextDuty: null,
};

describe("Tutor schedule route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue(database);
  });

  it("returns 401 and 403 before reading the owner schedule", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );
    const unauthorized = await GET(
      new Request("http://localhost/api/tutor/schedule?date=bad"),
    );
    expect(unauthorized.status).toBe(401);
    expect(mocks.getTutorSelfServiceSchedule).not.toHaveBeenCalled();

    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );
    const forbidden = await GET(
      new Request("http://localhost/api/tutor/schedule?tutorId=other"),
    );
    expect(forbidden.status).toBe(403);
    expect(mocks.getTutorSelfServiceSchedule).not.toHaveBeenCalled();
  });

  it("accepts only the approved date/week filters", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);

    const unknown = await GET(
      new Request("http://localhost/api/tutor/schedule?tutorId=other"),
    );
    const incompleteWeek = await GET(
      new Request("http://localhost/api/tutor/schedule?weekStart=2027-04-05"),
    );

    expect(unknown.status).toBe(400);
    expect(incompleteWeek.status).toBe(400);
    expect(mocks.getTutorSelfServiceSchedule).not.toHaveBeenCalled();
  });

  it("passes only the authenticated owner and validated window to the service", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);
    mocks.getTutorSelfServiceSchedule.mockResolvedValue(schedule);

    const response = await GET(
      new Request(
        "http://localhost/api/tutor/schedule?weekStart=2027-04-05&weekEnd=2027-04-11",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(schedule);
    expect(mocks.getTutorSelfServiceSchedule).toHaveBeenCalledWith(
      database,
      tutor.id,
      { weekStart: "2027-04-05", weekEnd: "2027-04-11" },
    );
  });

  it("returns a bounded conflict error without exposing internals", async () => {
    mocks.requireApiRole.mockResolvedValue(tutor);
    mocks.getTutorSelfServiceSchedule.mockRejectedValue(
      new Error("private schedule details"),
    );

    const response = await GET(new Request("http://localhost/api/tutor/schedule"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "internal_server_error",
    });
  });

  it("rejects non-GET requests without invoking the service", async () => {
    const response = POST();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
    expect(mocks.getTutorSelfServiceSchedule).not.toHaveBeenCalled();
  });
});
