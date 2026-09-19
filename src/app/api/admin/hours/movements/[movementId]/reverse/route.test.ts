import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  requireApiRole: vi.fn(),
  reverseHourMovement: vi.fn(),
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

  return { ...actual, reverseHourMovement: mocks.reverseHourMovement };
});

import {
  HOUR_ERROR_CODES,
  HourServiceError,
} from "@/features/hours/hour-service";

import { POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const movementId = "44444444-4444-4444-8444-444444444444";

function context(id = movementId) {
  return { params: Promise.resolve({ movementId: id }) };
}

function request(body?: string) {
  return new Request(
    `http://localhost/api/admin/hours/movements/${movementId}/reverse`,
    {
      method: "POST",
      ...(body === undefined
        ? {}
        : {
            headers: { "content-type": "application/json" },
            body,
          }),
    },
  );
}

describe("Admin hour movement reversal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("denies a Tutor before parsing the target or body", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await POST(request('{"direction":"DEBIT"}'), context());

    expect(response.status).toBe(403);
    expect(mocks.reverseHourMovement).not.toHaveBeenCalled();
  });

  it("rejects invalid targets and edit-shaped bodies", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const invalidIdResponse = await POST(request(), context("not-a-uuid"));
    const invalidBodyResponse = await POST(
      request('{"direction":"DEBIT"}'),
      context(),
    );

    expect(invalidIdResponse.status).toBe(400);
    expect(invalidBodyResponse.status).toBe(400);
    expect(mocks.reverseHourMovement).not.toHaveBeenCalled();
  });

  it("creates a reversal with the Admin request context", async () => {
    const database = {};
    const result = {
      original: { id: movementId, reversalState: "REVERSED" },
      reversal: {
        id: "55555555-5555-4555-8555-555555555555",
        reversalOfMovementId: movementId,
      },
    };
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.reverseHourMovement.mockResolvedValue(result);

    const response = await POST(
      new Request(
        `http://localhost/api/admin/hours/movements/${movementId}/reverse`,
        {
          method: "POST",
          headers: {
            "x-request-id": "reverse-1",
            "x-real-ip": "198.51.100.10",
          },
        },
      ),
      context(),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(result);
    expect(mocks.reverseHourMovement).toHaveBeenCalledWith(
      database,
      movementId,
      {
        actorId: admin.id,
        requestId: "reverse-1",
        ipAddress: "198.51.100.10",
      },
    );
  });

  it("maps an already reversed movement to a safe conflict", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.reverseHourMovement.mockRejectedValue(
      new HourServiceError(
        HOUR_ERROR_CODES.movementAlreadyReversed,
        "private reversal detail",
      ),
    );

    const response = await POST(request(), context());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: HOUR_ERROR_CODES.movementAlreadyReversed,
    });
  });
});
