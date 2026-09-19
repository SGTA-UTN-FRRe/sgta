import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  getHourWorkspace: vi.fn(),
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

  return { ...actual, getHourWorkspace: mocks.getHourWorkspace };
});

import {
  HOUR_ERROR_CODES,
  HourServiceError,
} from "@/features/hours/hour-service";

import { GET } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

const workspace = {
  currentCycle: {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Cycle 2027",
    startDate: "2027-01-01",
    endDate: "2027-12-31",
    status: "OPEN" as const,
  },
  balances: [],
  eligibleTutors: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      formalName: "Lovelace, Ada",
      careerName: "Systems",
      status: "ACTIVE" as const,
    },
  ],
  categories: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Meeting",
      activityKind: "MEETING" as const,
      status: "ACTIVE" as const,
      createdAt: "2027-01-01T00:00:00.000Z",
      updatedAt: "2027-01-01T00:00:00.000Z",
    },
  ],
};

describe("Admin hour workspace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 401 without loading the workspace", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.getHourWorkspace).not.toHaveBeenCalled();
  });

  it("returns 403 to a Tutor before reading hour data", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await GET();

    expect(response.status).toBe(403);
    expect(mocks.getHourWorkspace).not.toHaveBeenCalled();
  });

  it("returns the bounded workspace DTO for an Admin", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.getHourWorkspace.mockResolvedValue(workspace);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(workspace);
    expect(mocks.getHourWorkspace).toHaveBeenCalledWith(database);
  });

  it("returns explicit required-action errors for missing categories or tutors", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getHourWorkspace.mockResolvedValue({
      ...workspace,
      categories: [],
    });

    const noCategoriesResponse = await GET();
    expect(noCategoriesResponse.status).toBe(409);
    await expect(noCategoriesResponse.json()).resolves.toEqual({
      error: "no_active_categories",
    });

    mocks.getHourWorkspace.mockResolvedValue({
      ...workspace,
      eligibleTutors: [],
    });

    const noTutorsResponse = await GET();
    expect(noTutorsResponse.status).toBe(409);
    await expect(noTutorsResponse.json()).resolves.toEqual({
      error: "no_eligible_tutors",
    });
  });

  it("maps missing open-cycle state without exposing service details", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getHourWorkspace.mockRejectedValue(
      new HourServiceError(
        HOUR_ERROR_CODES.openCycleRequired,
        "private service detail",
      ),
    );

    const response = await GET();

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: HOUR_ERROR_CODES.openCycleRequired,
    });
  });
});
