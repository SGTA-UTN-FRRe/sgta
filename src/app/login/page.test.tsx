import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AuthorizationUnavailableError,
  getAuthorizedUser,
} from "@/auth/authorization";

import LoginPage from "./page";

const { LoginScreen } = vi.hoisted(() => ({
  LoginScreen: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/authorization")>();
  return { ...actual, getAuthorizedUser: vi.fn() };
});

vi.mock("./login-screen", () => ({ LoginScreen }));

describe("Login route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps an unauthenticated request on the login screen", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "identity_not_provisioned" }),
    });

    expect(page).toMatchObject({
      props: { state: "permission-denied" },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects an authenticated Admin to the Admin workspace", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });

    await expect(
      LoginPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/admin");
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("redirects an authenticated Tutor to the Tutor workspace", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
    });

    await expect(
      LoginPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/tutor");
    expect(redirect).toHaveBeenCalledWith("/tutor");
  });

  it("shows generic login feedback when the identity service is unavailable", async () => {
    vi.mocked(getAuthorizedUser).mockRejectedValue(
      new AuthorizationUnavailableError(),
    );

    const page = await LoginPage({ searchParams: Promise.resolve({}) });

    expect(page).toMatchObject({ props: { state: "error" } });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not retry an unavailable identity lookup through its recovery URL", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({ error: "authorization_unavailable" }),
    });

    expect(page).toMatchObject({ props: { state: "error" } });
    expect(getAuthorizedUser).not.toHaveBeenCalled();
  });
});
