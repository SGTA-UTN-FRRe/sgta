import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  provisionUser: vi.fn(),
  requireApiRole: vi.fn(),
}));

vi.mock("@/auth/authorization", () => ({
  requireApiRole: mocks.requireApiRole,
}));
vi.mock("@/auth/provisioning", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/provisioning")>();

  return { ...actual, provisionUser: mocks.provisionUser };
});
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));

import { POST } from "./route";

const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
};
const provisionedUser = {
  id: "tutor-1",
  name: "Tutor Example",
  email: "tutor@example.com",
  role: "TUTOR" as const,
  enabled: true,
};

function requestWithBody(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/admin/users", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Admin user provisioning route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns 401 before reading a provisioning payload without an Admin session", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "unauthorized" }, { status: 401 }),
    );

    const response = await POST(
      requestWithBody({
        email: "tutor@example.com",
        name: "Tutor Example",
        role: "TUTOR",
        enabled: true,
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.provisionUser).not.toHaveBeenCalled();
  });

  it("returns 403 for an authenticated non-Admin session", async () => {
    mocks.requireApiRole.mockResolvedValue(
      Response.json({ error: "forbidden" }, { status: 403 }),
    );

    const response = await POST(requestWithBody({}));

    expect(response.status).toBe(403);
    expect(mocks.provisionUser).not.toHaveBeenCalled();
  });

  it("rejects invalid provisioning input at the request boundary", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);

    const response = await POST(
      requestWithBody({
        email: "not-an-email",
        name: "",
        role: "MANAGER",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
    });
    expect(mocks.provisionUser).not.toHaveBeenCalled();
  });

  it("provisions through the Admin guard and returns the safe user shape", async () => {
    const database = {};
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.getDatabase.mockReturnValue(database);
    mocks.provisionUser.mockResolvedValue(provisionedUser);

    const response = await POST(
      requestWithBody(
        {
          email: "  Tutor@Example.COM ",
          name: "  Tutor Example ",
          role: "TUTOR",
          enabled: true,
        },
        {
          "x-request-id": "request-1",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
        },
      ),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: provisionedUser,
    });
    expect(mocks.provisionUser).toHaveBeenCalledWith(
      database,
      {
        email: "tutor@example.com",
        name: "Tutor Example",
        role: "TUTOR",
        enabled: true,
      },
      {
        actorId: admin.id,
        requestId: "request-1",
        ipAddress: "203.0.113.10",
        source: "admin",
      },
    );
  });

  it("returns a safe 500 response when persistence fails", async () => {
    mocks.requireApiRole.mockResolvedValue(admin);
    mocks.provisionUser.mockRejectedValue(
      new Error("database password leaked by a low-level driver"),
    );

    const response = await POST(
      requestWithBody({
        email: "tutor@example.com",
        name: "Tutor Example",
        role: "TUTOR",
        enabled: true,
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "internal_server_error",
    });
  });
});
