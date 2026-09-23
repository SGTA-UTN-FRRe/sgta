import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/tutors",
}));

describe("AppSidebar", () => {
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
    const lastLink = links.at(-1);

    if (firstLink === undefined || lastLink === undefined) {
      throw new Error("The mobile drawer should contain navigation links.");
    }

    lastLink.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(firstLink).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(lastLink).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
