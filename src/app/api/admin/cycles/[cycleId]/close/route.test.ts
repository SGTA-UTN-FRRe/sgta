import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  closeAdministrativeCycle: vi.fn(),
  getDatabase: vi.fn(),
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
    closeAdministrativeCycle: mocks.closeAdministrativeCycle,
  };
});

import {
  CYCLE_ERROR_CODES,
  CycleServiceError,
} from "@/features/cycles/cycle-service";

import { POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};

const closedCycle = {
  id: "cycle-1",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "CLOSED" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-09-16T12:00:00.000Z",
};

function request(headers?: HeadersInit) {
  return new Request(
    "http://localhost/api/admin/cycles/cycle-1/close",
    { method: "POST", headers },
  );
}

function context(cycleId = "cycle-1") {
  return { params: Promise.resolve({ cycleId }) };
}

describe("Admin cycle close route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor before parsing or closing a cycle", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await POST(request(), context());

    expect(response.status).toBe(403);
    expect(mocks.closeAdministrativeCycle).not.toHaveBeenCalled();
  });

  it("rejects an invalid cycle identifier", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const response = await POST(request(), context(""));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(mocks.closeAdministrativeCycle).not.toHaveBeenCalled();
  });

  it("closes a cycle with the Admin actor and request context", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.closeAdministrativeCycle.mockResolvedValue(closedCycle);

    const response = await POST(
      request({
        "x-request-id": "request-2",
        "x-real-ip": "198.51.100.10",
      }),
      context(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cycle: closedCycle });
    expect(mocks.closeAdministrativeCycle).toHaveBeenCalledWith(
      database,
      "cycle-1",
      {
        actorId: admin.id,
        requestId: "request-2",
        ipAddress: "198.51.100.10",
      },
    );
  });

  it("maps a repeated close to a safe conflict response", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.closeAdministrativeCycle.mockRejectedValue(
      new CycleServiceError(
        CYCLE_ERROR_CODES.cycleAlreadyClosed,
        "The cycle is already closed.",
      ),
    );

    const response = await POST(request(), context());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: CYCLE_ERROR_CODES.cycleAlreadyClosed,
    });
  });
});
