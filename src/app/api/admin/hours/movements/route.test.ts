import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  listHourMovements: vi.fn(),
  recognizeRecovery: vi.fn(),
  recordBulkHourMovement: vi.fn(),
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
    listHourMovements: mocks.listHourMovements,
    recognizeRecovery: mocks.recognizeRecovery,
    recordBulkHourMovement: mocks.recordBulkHourMovement,
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

const ids = {
  cycleId: "11111111-1111-4111-8111-111111111111",
  tutorId: "22222222-2222-4222-8222-222222222222",
  categoryId: "33333333-3333-4333-8333-333333333333",
};

const movement = {
  id: "44444444-4444-4444-8444-444444444444",
  direction: "CREDIT" as const,
  durationMinutes: 90,
};

function requestWithBody(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/admin/hours/movements", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  cycleId: ids.cycleId,
  tutorIds: [ids.tutorId],
  categoryId: ids.categoryId,
  direction: "CREDIT",
  duration: { hours: 1, minutes: 30 },
  movementDate: "2027-02-15",
  note: "Weekly coordination",
};

describe("Admin hour movement collection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies unauthenticated reads and writes before parsing or loading", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const readResponse = await GET(
      new Request("http://localhost/api/admin/hours/movements?limit=bad"),
    );
    const writeResponse = await POST(requestWithBody(validBody));

    expect(readResponse.status).toBe(401);
    expect(writeResponse.status).toBe(401);
    expect(mocks.listHourMovements).not.toHaveBeenCalled();
    expect(mocks.recordBulkHourMovement).not.toHaveBeenCalled();
  });

  it("parses movement history filters before querying", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.listHourMovements.mockResolvedValue([movement]);

    const response = await GET(
      new Request(
        `http://localhost/api/admin/hours/movements?cycleId=${ids.cycleId}&tutorId=${ids.tutorId}&categoryId=${ids.categoryId}&offset=5&limit=20`,
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ movements: [movement] });
    expect(mocks.listHourMovements).toHaveBeenCalledWith({}, {
      cycleId: ids.cycleId,
      tutorId: ids.tutorId,
      categoryId: ids.categoryId,
      offset: 5,
      limit: 20,
    });
  });

  it("rejects unknown query and body fields before invoking the service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const invalidQuery = await GET(
      new Request("http://localhost/api/admin/hours/movements?unexpected=true"),
    );
    const invalidBody = await POST(
      requestWithBody({ ...validBody, unexpected: true }),
    );

    expect(invalidQuery.status).toBe(400);
    expect(invalidBody.status).toBe(400);
    expect(mocks.listHourMovements).not.toHaveBeenCalled();
    expect(mocks.recordBulkHourMovement).not.toHaveBeenCalled();
  });

  it("records a bulk movement with the authenticated Admin context", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.recordBulkHourMovement.mockResolvedValue({
      cycle: { id: ids.cycleId },
      origin: null,
      movements: [movement],
    });

    const response = await POST(
      requestWithBody(validBody, {
        "x-request-id": "movement-1",
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.recordBulkHourMovement).toHaveBeenCalledWith(
      database,
      {
        ...validBody,
        duration: 90,
      },
      {
        actorId: admin.id,
        requestId: "movement-1",
        ipAddress: "203.0.113.10",
      },
    );
  });

  it("routes explicit recovery recognition through the recovery service", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.recognizeRecovery.mockResolvedValue({
      cycle: { id: ids.cycleId },
      origin: { kind: "RECOVERY" },
      movements: [movement],
    });

    const response = await POST(
      requestWithBody({ ...validBody, operation: "RECOVERY" }),
    );

    expect(response.status).toBe(201);
    expect(mocks.recognizeRecovery).toHaveBeenCalledWith(
      {},
      { ...validBody, duration: 90 },
      { actorId: admin.id, requestId: undefined, ipAddress: undefined },
    );
    expect(mocks.recordBulkHourMovement).not.toHaveBeenCalled();
  });

  it("maps reversal and transaction conflicts to safe HTTP responses", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.recordBulkHourMovement.mockRejectedValue(
      new HourServiceError(
        HOUR_ERROR_CODES.inactiveCategory,
        "private category detail",
      ),
    );

    const conflictResponse = await POST(requestWithBody(validBody));
    expect(conflictResponse.status).toBe(409);
    await expect(conflictResponse.json()).resolves.toEqual({
      error: HOUR_ERROR_CODES.inactiveCategory,
    });

    mocks.recordBulkHourMovement.mockRejectedValue(
      new HourServiceError(
        HOUR_ERROR_CODES.transactionFailed,
        "private persistence detail",
      ),
    );
    const failureResponse = await POST(requestWithBody(validBody));
    expect(failureResponse.status).toBe(500);
    await expect(failureResponse.json()).resolves.toEqual({
      error: "internal_server_error",
    });
  });
});
