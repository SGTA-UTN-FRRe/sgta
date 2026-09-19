import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
  updateHourCategory: vi.fn(),
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

  return { ...actual, updateHourCategory: mocks.updateHourCategory };
});

import { PATCH } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const categoryId = "33333333-3333-4333-8333-333333333333";

function context(id = categoryId) {
  return { params: Promise.resolve({ categoryId: id }) };
}

function requestWithBody(body: unknown) {
  return new Request(
    `http://localhost/api/admin/settings/hour-categories/${categoryId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Admin hour category detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("rejects invalid identifiers and empty updates", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const invalidIdResponse = await PATCH(
      requestWithBody({ name: "Meeting" }),
      context("not-a-uuid"),
    );
    const invalidBodyResponse = await PATCH(
      requestWithBody({}),
      context(),
    );

    expect(invalidIdResponse.status).toBe(400);
    expect(invalidBodyResponse.status).toBe(400);
    expect(mocks.updateHourCategory).not.toHaveBeenCalled();
  });

  it("is Admin-authorized and passes the parsed update to the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.updateHourCategory.mockResolvedValue({ id: categoryId });

    const response = await PATCH(requestWithBody({ name: "New name" }), context());

    expect(response.status).toBe(200);
    expect(mocks.updateHourCategory).toHaveBeenCalledWith(
      {},
      categoryId,
      { name: "New name" },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
  });
});
