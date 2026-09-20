import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSchedulePlan: vi.fn(),
  getDatabase: vi.fn(),
  listSchedulePlans: vi.fn(),
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

  return {
    ...actual,
    createSchedulePlan: mocks.createSchedulePlan,
    listSchedulePlans: mocks.listSchedulePlans,
  };
});

import { GET, POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const cycleId = "11111111-1111-4111-8111-111111111111";

function requestWithBody(body: unknown) {
  return new Request("http://localhost/api/admin/schedules/plans", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Admin schedule plan collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies unauthenticated reads and writes before parsing", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const read = await GET(
      new Request("http://localhost/api/admin/schedules/plans?cycleId=bad"),
    );
    const write = await POST(requestWithBody({ unexpected: true }));

    expect(read.status).toBe(401);
    expect(write.status).toBe(401);
    expect(mocks.listSchedulePlans).not.toHaveBeenCalled();
    expect(mocks.createSchedulePlan).not.toHaveBeenCalled();
  });

  it("rejects unknown query and body fields before domain operations", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const read = await GET(
      new Request(
        `http://localhost/api/admin/schedules/plans?cycleId=${cycleId}&unexpected=true`,
      ),
    );
    const write = await POST(
      requestWithBody({
        cycleId,
        name: "Regular",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
        unexpected: true,
      }),
    );

    expect(read.status).toBe(400);
    expect(write.status).toBe(400);
    expect(mocks.listSchedulePlans).not.toHaveBeenCalled();
    expect(mocks.createSchedulePlan).not.toHaveBeenCalled();
  });

  it("lists and creates plans with an Admin actor context", async () => {
    const database = {};
    const plan = { id: "22222222-2222-4222-8222-222222222222" };
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.listSchedulePlans.mockResolvedValue([plan]);
    mocks.createSchedulePlan.mockResolvedValue(plan);

    const read = await GET(
      new Request(`http://localhost/api/admin/schedules/plans?cycleId=${cycleId}`),
    );
    const body = {
      cycleId,
      name: "Regular",
      kind: "REGULAR",
      validFrom: "2027-01-01",
      validTo: "2027-12-31",
    };
    const write = await POST(requestWithBody(body));

    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toEqual({ plans: [plan] });
    expect(write.status).toBe(201);
    await expect(write.json()).resolves.toEqual({ plan });
    expect(mocks.createSchedulePlan).toHaveBeenCalledWith(
      database,
      { ...body, status: "ACTIVE" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
  });
});
