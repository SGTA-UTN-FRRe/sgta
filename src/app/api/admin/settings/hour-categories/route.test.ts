import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createHourCategory: vi.fn(),
  getDatabase: vi.fn(),
  listHourCategories: vi.fn(),
  requireApiRole: vi.fn(),
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

  return {
    ...actual,
    createHourCategory: mocks.createHourCategory,
    listHourCategories: mocks.listHourCategories,
  };
});

import {
  HOUR_ERROR_CODES,
  HourServiceError,
} from "@/features/hours/hour-service";

import { GET, POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

const category = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Team meeting",
  activityKind: "MEETING" as const,
  status: "ACTIVE" as const,
  createdAt: "2027-01-01T00:00:00.000Z",
  updatedAt: "2027-01-01T00:00:00.000Z",
};

function requestWithBody(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/admin/settings/hour-categories", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("Admin hour category collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor from reading or maintaining categories", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const readResponse = await GET(new Request("http://localhost"));
    const writeResponse = await POST(requestWithBody({ name: "Meeting" }));

    expect(readResponse.status).toBe(403);
    expect(writeResponse.status).toBe(403);
    expect(mocks.listHourCategories).not.toHaveBeenCalled();
    expect(mocks.createHourCategory).not.toHaveBeenCalled();
  });

  it("lists all categories by default and parses status filters", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.listHourCategories.mockResolvedValue([category]);

    const response = await GET(
      new Request(
        "http://localhost/api/admin/settings/hour-categories?status=active",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ categories: [category] });
    expect(mocks.listHourCategories).toHaveBeenCalledWith({}, "ACTIVE");
  });

  it("rejects unknown query keys and unsupported activity kinds", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const invalidQuery = await GET(
      new Request(
        "http://localhost/api/admin/settings/hour-categories?unexpected=true",
      ),
    );
    const invalidBody = await POST(
      requestWithBody({ name: "Recovery", activityKind: "SCHEDULE" }),
    );

    expect(invalidQuery.status).toBe(400);
    expect(invalidBody.status).toBe(400);
    expect(mocks.listHourCategories).not.toHaveBeenCalled();
    expect(mocks.createHourCategory).not.toHaveBeenCalled();
  });

  it("creates a category with bounded actor request context", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.createHourCategory.mockResolvedValue(category);

    const response = await POST(
      requestWithBody(
        { name: " Team meeting ", activityKind: "MEETING" },
        {
          "x-request-id": "category-1",
          "x-forwarded-for": "203.0.113.20, 10.0.0.1",
        },
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ category });
    expect(mocks.createHourCategory).toHaveBeenCalledWith(
      database,
      { name: "Team meeting", activityKind: "MEETING" },
      {
        actorId: admin.id,
        requestId: "category-1",
        ipAddress: "203.0.113.20",
      },
    );
  });

  it("maps normalized-name conflicts to a safe response", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.createHourCategory.mockRejectedValue(
      new HourServiceError(
        HOUR_ERROR_CODES.duplicateCategoryName,
        "private duplicate detail",
      ),
    );

    const response = await POST(requestWithBody({ name: "Meeting" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: HOUR_ERROR_CODES.duplicateCategoryName,
    });
  });
});
