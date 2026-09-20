import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getScheduleWorkspace: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/schedules/schedule-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/schedules/schedule-service")
  >();

  return { ...actual, getScheduleWorkspace: mocks.getScheduleWorkspace };
});

import {
  SCHEDULE_ERROR_CODES,
  ScheduleServiceError,
} from "@/features/schedules/schedule-service";

import { GET } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

const ids = {
  cycleId: "11111111-1111-4111-8111-111111111111",
  planId: "22222222-2222-4222-8222-222222222222",
};

describe("Admin schedule workspace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 401 and 403 before parsing or loading protected data", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const unauthorized = await GET(
      new Request("http://localhost/api/admin/schedules?date=invalid"),
    );
    expect(unauthorized.status).toBe(401);
    expect(mocks.getScheduleWorkspace).not.toHaveBeenCalled();

    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );
    const forbidden = await GET(
      new Request("http://localhost/api/admin/schedules?unexpected=true"),
    );
    expect(forbidden.status).toBe(403);
    expect(mocks.getScheduleWorkspace).not.toHaveBeenCalled();
  });

  it("rejects unknown and malformed query input before the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const unknown = await GET(
      new Request("http://localhost/api/admin/schedules?unexpected=true"),
    );
    const malformed = await GET(
      new Request("http://localhost/api/admin/schedules?cycleId=bad"),
    );

    expect(unknown.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(mocks.getScheduleWorkspace).not.toHaveBeenCalled();
  });

  it("returns the bounded workspace with the authenticated request context", async () => {
    const database = {};
    const workspace = {
      currentCycle: { id: ids.cycleId, status: "OPEN" },
      plans: [],
      selectedPlan: null,
      assignments: [],
      eligibleTutors: [],
      conflicts: [],
      requestedDate: "2027-02-15",
      effective: { date: "2027-02-15", plan: null, occurrences: [] },
    };
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.getScheduleWorkspace.mockResolvedValue(workspace);

    const response = await GET(
      new Request(
        `http://localhost/api/admin/schedules?cycleId=${ids.cycleId}&planId=${ids.planId}&date=2027-02-15`,
        { headers: { "x-request-id": "schedule-read-1" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(workspace);
    expect(mocks.getScheduleWorkspace).toHaveBeenCalledWith(
      database,
      { cycleId: ids.cycleId, planId: ids.planId, date: "2027-02-15" },
      {
        actorId: admin.id,
        requestId: "schedule-read-1",
        ipAddress: undefined,
      },
    );
  });

  it("maps missing open-cycle state without exposing service details", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getScheduleWorkspace.mockRejectedValue(
      new ScheduleServiceError(
        SCHEDULE_ERROR_CODES.openCycleRequired,
        "private cycle detail",
      ),
    );

    const response = await GET(
      new Request("http://localhost/api/admin/schedules"),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: SCHEDULE_ERROR_CODES.openCycleRequired,
    });
  });
});
