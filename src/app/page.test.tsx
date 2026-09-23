import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import {
  AuthorizationUnavailableError,
  getAuthorizedUser,
} from "@/auth/authorization";

import Home from "./page";

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

describe("Home route", () => {
  it("redirects an unauthenticated request to login", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue(null);

    await expect(Home()).rejects.toThrow("redirect:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("sends an authenticated Admin to the Admin workspace", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });

    await expect(Home()).rejects.toThrow("redirect:/admin");
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("sends an authenticated Tutor to the Tutor workspace", async () => {
    vi.mocked(getAuthorizedUser).mockResolvedValue({
      id: "tutor-1",
      name: "Tutor",
      email: "tutor@example.com",
      role: "TUTOR",
    });

    await expect(Home()).rejects.toThrow("redirect:/tutor");
    expect(redirect).toHaveBeenCalledWith("/tutor");
  });

  it("redirects identity lookup failures to a safe login state", async () => {
    vi.mocked(getAuthorizedUser).mockRejectedValue(
      new AuthorizationUnavailableError(),
    );

    await expect(Home()).rejects.toThrow(
      "redirect:/login?error=authorization_unavailable",
    );
    expect(redirect).toHaveBeenCalledWith(
      "/login?error=authorization_unavailable",
    );
  });
});
