import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import Home from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Home route", () => {
  it("redirects the root route to login", () => {
    Home();

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
