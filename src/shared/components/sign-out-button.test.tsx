import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignOutButton } from "./sign-out-button";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/auth/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("SignOutButton", () => {
  it("disables repeated activation until sign-out succeeds, then replaces and refreshes the route", async () => {
    const user = userEvent.setup();
    let resolveSignOut!: (value: { error: null }) => void;
    mocks.signOut.mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve;
    }));
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const button = screen.getByRole("button", { name: "Cerrando sesión…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => { resolveSignOut({ error: null }); });
    expect(mocks.replace).toHaveBeenCalledExactlyOnceWith("/login");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.replace.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.refresh.mock.invocationCallOrder[0]!,
    );
  });

  it.each(["response", "network"])("announces a %s failure without navigating and permits retry", async (failure) => {
    const user = userEvent.setup();
    if (failure === "response") {
      mocks.signOut.mockResolvedValueOnce({ error: { message: "Rejected" } });
    } else {
      mocks.signOut.mockRejectedValueOnce(new Error("Network unavailable"));
    }
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo cerrar la sesión. Intentar nuevamente.",
    );
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();

    mocks.signOut.mockResolvedValueOnce({ error: null });
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
