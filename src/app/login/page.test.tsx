import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { getAuthorizedUser } from "@/auth/authorization";

import LoginPage from "./page";

const { LoginScreen } = vi.hoisted(() => ({
  LoginScreen: vi.fn(() => null),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("@/auth/authorization", () => ({
  getAuthorizedUser: vi.fn(),
}));

vi.mock("./login-screen", () => ({ LoginScreen }));

describe("Login route", () => {
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
});
