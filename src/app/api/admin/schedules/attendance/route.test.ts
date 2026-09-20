import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  listAttendanceForDate: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/schedules/attendance-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/schedules/attendance-service")
  >();

  return { ...actual, listAttendanceForDate: mocks.listAttendanceForDate };
});

import { GET } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const cycleId = "11111111-1111-4111-8111-111111111111";

describe("Admin attendance collection route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 401 and 403 before loading date occurrences", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );
    const unauthorized = await GET(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=${cycleId}&date=bad`,
      ),
    );
    expect(unauthorized.status).toBe(401);
    expect(mocks.listAttendanceForDate).not.toHaveBeenCalled();

    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );
    const forbidden = await GET(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=${cycleId}&date=2027-02-15`,
      ),
    );
    expect(forbidden.status).toBe(403);
    expect(mocks.listAttendanceForDate).not.toHaveBeenCalled();
  });

  it("rejects unknown and malformed query keys before the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const unknown = await GET(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=${cycleId}&date=2027-02-15&unexpected=true`,
      ),
    );
    const malformed = await GET(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=bad&date=2027-02-15`,
      ),
    );

    expect(unknown.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(mocks.listAttendanceForDate).not.toHaveBeenCalled();
  });

  it("loads the date collection with the authenticated actor context", async () => {
    const database = {};
    const result = {
      cycle: { id: cycleId, status: "OPEN" },
      plan: null,
      date: "2027-02-15",
      occurrences: [],
    };
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.listAttendanceForDate.mockResolvedValue(result);

    const response = await GET(
      new Request(
        `http://localhost/api/admin/schedules/attendance?cycleId=${cycleId}&date=2027-02-15`,
        { headers: { "x-real-ip": "203.0.113.10" } },
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(result);
    expect(mocks.listAttendanceForDate).toHaveBeenCalledWith(
      database,
      { cycleId, date: "2027-02-15" },
      { actorId: admin.id, requestId: undefined, ipAddress: "203.0.113.10" },
    );
  });
});
