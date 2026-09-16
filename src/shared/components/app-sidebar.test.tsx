import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/tutores",
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

  it("renders active Faro Marker on active link", () => {
    render(<AppSidebar variant="admin" />);
    const marker = screen.getByTestId("faro-marker");
    expect(marker).toBeInTheDocument();
  });
});
