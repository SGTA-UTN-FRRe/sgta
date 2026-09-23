import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  createAdministrativeCycle: vi.fn(),
  getDatabase: vi.fn(),
  listAdministrativeCycles: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/features/cycles/cycle-service", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/features/cycles/cycle-service")
  >();

  return {
    ...actual,
    createAdministrativeCycle: mocks.createAdministrativeCycle,
    listAdministrativeCycles: mocks.listAdministrativeCycles,
  };
});

import {
  CYCLE_ERROR_CODES,
  CycleServiceError,
} from "@/features/cycles/cycle-service";

import { GET, POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

const cycle = {
  id: "cycle-1",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function requestWithBody(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/admin/cycles", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Admin cycle collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 401 without reading cycle data", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.listAdministrativeCycles).not.toHaveBeenCalled();
  });

  it("returns 403 to a Tutor before handling a cycle mutation", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await POST(
      requestWithBody({
        name: "Ciclo 2026",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.createAdministrativeCycle).not.toHaveBeenCalled();
  });

  it("lists the safe cycle history for an Admin", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.listAdministrativeCycles.mockResolvedValue([cycle]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cycles: [cycle] });
    expect(mocks.listAdministrativeCycles).toHaveBeenCalledWith(database);
  });

  it("rejects an invalid date range at the request boundary", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const response = await POST(
      requestWithBody({
        name: "Ciclo 2026",
        startDate: "2026-12-31",
        endDate: "2026-01-01",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: CYCLE_ERROR_CODES.invalidDateRange,
    });
    expect(mocks.createAdministrativeCycle).not.toHaveBeenCalled();
  });

  it("creates a cycle with bounded request audit context", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.createAdministrativeCycle.mockResolvedValue(cycle);

    const response = await POST(
      requestWithBody(
        {
          name: "  Ciclo 2026 ",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        },
        {
          "x-request-id": "request-1",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        },
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ cycle });
    expect(mocks.createAdministrativeCycle).toHaveBeenCalledWith(
      database,
      {
        name: "Ciclo 2026",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      },
      {
        actorId: admin.id,
        requestId: "request-1",
        ipAddress: "203.0.113.10",
      },
    );
  });

  it("maps an open-cycle conflict without exposing persistence details", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.createAdministrativeCycle.mockRejectedValue(
      new CycleServiceError(
        CYCLE_ERROR_CODES.openCycleExists,
        "An open cycle already exists.",
      ),
    );

    const response = await POST(
      requestWithBody({
        name: "Ciclo 2027",
        startDate: "2027-01-01",
        endDate: "2027-12-31",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: CYCLE_ERROR_CODES.openCycleExists,
    });
  });
});
