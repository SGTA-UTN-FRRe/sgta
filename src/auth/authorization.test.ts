import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(),
  getDatabase: vi.fn(),
  getSession: vi.fn(),
  findAuthorizedUserById: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("./index", () => ({ getAuth: mocks.getAuth }));
vi.mock("./policy", () => ({
  findAuthorizedUserById: mocks.findAuthorizedUserById,
}));
vi.mock("@/db/client", () => ({ getDatabase: mocks.getDatabase }));

import {
  getAuthorizedUser,
  requireApiRole,
  requireRole,
} from "./authorization";

const requestHeaders = new Headers({ cookie: "better-auth.session=opaque" });
const admin = {
  id: "admin-1",
  name: "Admin",
  email: "admin@example.com",
  role: "ADMIN" as const,
  enabled: true,
};

describe("server authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(requestHeaders);
    mocks.getAuth.mockReturnValue({
      api: { getSession: mocks.getSession },
    });
    mocks.getDatabase.mockReturnValue({});
  });

  it("returns no user when the request has no Better Auth session", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(getAuthorizedUser()).resolves.toBeNull();
    expect(mocks.findAuthorizedUserById).not.toHaveBeenCalled();
  });

  it("rechecks the database and rejects a disabled identity", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: admin.id } });
    mocks.findAuthorizedUserById.mockResolvedValue({
      ...admin,
      enabled: false,
    });

    await expect(getAuthorizedUser()).resolves.toBeNull();
    expect(mocks.findAuthorizedUserById).toHaveBeenCalledWith({}, admin.id);
  });

  it("returns only safe current database fields and keeps the database role authoritative", async () => {
    mocks.getSession.mockResolvedValue({
      user: { id: admin.id, role: "TUTOR" },
    });
    mocks.findAuthorizedUserById.mockResolvedValue(admin);

    await expect(getAuthorizedUser()).resolves.toEqual({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN",
    });
    expect(mocks.getSession).toHaveBeenCalledWith({ headers: requestHeaders });
  });

  it("redirects missing page sessions to login", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(requireRole("ADMIN")).rejects.toThrow("redirect:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects an authenticated user with the wrong role to forbidden", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "tutor-1" } });
    mocks.findAuthorizedUserById.mockResolvedValue({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
      enabled: true,
    });

    await expect(requireRole("ADMIN")).rejects.toThrow("redirect:/forbidden");
    expect(redirect).toHaveBeenCalledWith("/forbidden");
  });

  it("allows an enabled Admin through the matching page guard", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: admin.id } });
    mocks.findAuthorizedUserById.mockResolvedValue(admin);

    await expect(requireRole("ADMIN")).resolves.toEqual({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "ADMIN",
    });
  });

  it("allows an enabled Tutor through the matching page guard", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "tutor-1" } });
    mocks.findAuthorizedUserById.mockResolvedValue({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
      enabled: true,
    });

    await expect(requireRole("TUTOR")).resolves.toEqual({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
    });
  });

  it("returns 401 for an unauthenticated API request", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await requireApiRole("ADMIN");

    expect(response).toBeInstanceOf(Response);
    expect(response).toHaveProperty("status", 401);
    await expect((response as Response).json()).resolves.toEqual({
      error: "unauthorized",
    });
  });

  it("returns 403 when an enabled Tutor calls an Admin API", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "tutor-1" } });
    mocks.findAuthorizedUserById.mockResolvedValue({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
      enabled: true,
    });

    const response = await requireApiRole("ADMIN");

    expect(response).toBeInstanceOf(Response);
    expect(response).toHaveProperty("status", 403);
    await expect((response as Response).json()).resolves.toEqual({
      error: "forbidden",
    });
  });

  it("allows an enabled Tutor through the matching API guard", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "tutor-1" } });
    mocks.findAuthorizedUserById.mockResolvedValue({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
      enabled: true,
    });

    await expect(requireApiRole("TUTOR")).resolves.toEqual({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
    });
  });
});
