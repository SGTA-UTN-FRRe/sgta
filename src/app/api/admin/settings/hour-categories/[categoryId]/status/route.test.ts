import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
  setHourCategoryStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/hours/hour-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/hours/hour-service")
  >();

  return { ...actual, setHourCategoryStatus: mocks.setHourCategoryStatus };
});

import { PATCH } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const categoryId = "33333333-3333-4333-8333-333333333333";

function context() {
  return { params: Promise.resolve({ categoryId }) };
}

function requestWithBody(body: unknown) {
  return new Request(
    `http://localhost/api/admin/settings/hour-categories/${categoryId}/status`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Admin hour category status route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor before invoking the lifecycle mutation", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await PATCH(
      requestWithBody({ status: "INACTIVE" }),
      context(),
    );

    expect(response.status).toBe(403);
    expect(mocks.setHourCategoryStatus).not.toHaveBeenCalled();
  });

  it("rejects unsupported status values before calling the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const response = await PATCH(
      requestWithBody({ status: "PAUSED" }),
      context(),
    );

    expect(response.status).toBe(400);
    expect(mocks.setHourCategoryStatus).not.toHaveBeenCalled();
  });

  it("passes status changes and actor context to the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.setHourCategoryStatus.mockResolvedValue({ id: categoryId });

    const response = await PATCH(
      requestWithBody({ status: "INACTIVE" }),
      context(),
    );

    expect(response.status).toBe(200);
    expect(mocks.setHourCategoryStatus).toHaveBeenCalledWith(
      {},
      categoryId,
      { status: "INACTIVE" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
  });
});
