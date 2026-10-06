import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { AppSidebar } from "./app-sidebar";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/auth/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/tutors",
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("AppSidebar", () => {
  it.each(["admin", "tutor"] as const)("offers sign-out without user data in the %s shell", async (variant) => {
    const user = userEvent.setup();
    mocks.signOut.mockResolvedValue({ error: null });
    render(<AppSidebar variant={variant} />);

    expect(screen.getByText(variant === "admin" ? "Administrador" : "Tutor")).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(button).toHaveAttribute("title", "Cerrar sesión");
    expect(button).toHaveClass("min-h-11");
    await user.click(button);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith("/login");
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps pending and failed sign-out accessible in the mobile drawer", async () => {
    const user = userEvent.setup();
    let resolveSignOut!: (value: { error: { message: string } }) => void;
    mocks.signOut.mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve;
    }));
    render(<AppSidebar variant="tutor" />);
    await user.click(screen.getByRole("button", { name: "Abrir navegación" }));
    const drawer = within(screen.getByRole("dialog"));
    await user.click(drawer.getByRole("button", { name: "Cerrar sesión" }));
    expect(drawer.getByRole("button", { name: "Cerrando sesión…" })).toBeDisabled();

    await act(async () => { resolveSignOut({ error: { message: "Rejected" } }); });
    expect(drawer.getByRole("alert")).toHaveTextContent(
      "No se pudo cerrar la sesión. Intentar nuevamente.",
    );
    expect(drawer.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("renders all administrative links in admin variant", () => {
    render(<AppSidebar variant="admin" />);

    expect(screen.getByText("Tutores")).toBeInTheDocument();
    expect(screen.getByText("Horarios")).toBeInTheDocument();
    expect(screen.getByText("Horas")).toBeInTheDocument();
    expect(screen.getByText("Consultas")).toBeInTheDocument();
    expect(screen.getByText("Reportes")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });

  it("renders only tutor links in tutor variant without admin links", () => {
    render(<AppSidebar variant="tutor" />);

    expect(screen.getByText("Mi resumen")).toBeInTheDocument();
    expect(screen.getByText("Mi horario")).toBeInTheDocument();
    expect(screen.getByText("Mis horas")).toBeInTheDocument();

    expect(screen.queryByText("Configuración")).not.toBeInTheDocument();
    expect(screen.queryByText("Reportes")).not.toBeInTheDocument();
  });

  it("renders only safe authenticated display fields", () => {
    render(
      <AppSidebar
        variant="admin"
        user={{ name: "Admin Example", role: "ADMIN" }}
      />,
    );

    expect(screen.getByText("Admin Example")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
  });

  it("renders active Faro Marker on active link", () => {
    render(<AppSidebar variant="admin" />);
    const marker = screen.getByTestId("faro-marker");
    expect(marker).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tutores" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("contains keyboard focus in the mobile drawer and restores the trigger", async () => {
    const user = userEvent.setup();
    render(<AppSidebar variant="admin" />);

    const trigger = screen.getByRole("button", { name: "Abrir navegación" });
    await user.click(trigger);

    expect(document.activeElement).toHaveAttribute("aria-label", "Cerrar navegación");

    const dialog = screen.getByRole("dialog", {
      name: "Navegación de administración",
    });
    const links = within(dialog).getAllByRole("link");
    const firstLink = links[0];
    const signOut = within(dialog).getByRole("button", { name: "Cerrar sesión" });

    if (firstLink === undefined) {
      throw new Error("The mobile drawer should contain navigation links.");
    }

    signOut.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(firstLink).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(signOut).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
