import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import ForbiddenPage from "./page";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue({ error: null }),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/auth/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

it("offers sign-out beside the home link on the restricted-access page", async () => {
  const user = userEvent.setup();
  render(<ForbiddenPage />);

  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    "No tienes permisos para esta sección",
  );
  expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
  const button = screen.getByRole("button", { name: "Cerrar sesión" });
  expect(button).toHaveClass("border", "min-h-11");
  await user.click(button);
  expect(mocks.signOut).toHaveBeenCalledTimes(1);
  expect(mocks.replace).toHaveBeenCalledWith("/login");
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
});
