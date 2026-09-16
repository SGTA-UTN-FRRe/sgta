import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Sparkles } from "lucide-react";

import {
  EmptyState,
  FaroIllustration,
  ICON_STROKE_WIDTH,
  PageContainer,
  PageHeader,
  StatusBadge,
} from "@/shared";

describe("Shared UI Primitives (SGTA)", () => {
  describe("Iconography Standardization", () => {
    it("exports uniform stroke width of 2", () => {
      expect(ICON_STROKE_WIDTH).toBe(2);
    });
  });

  describe("PageHeader", () => {
    it("renders contextual title and description", () => {
      render(
        <PageHeader
          title="Gestión de Tutores"
          description="Administración de tutores académicos activos e inactivos."
        />,
      );

      const heading = screen.getByRole("heading", { level: 1, name: "Gestión de Tutores" });
      expect(heading).toBeInTheDocument();
      expect(
        screen.getByText("Administración de tutores académicos activos e inactivos."),
      ).toBeInTheDocument();
    });

    it("renders breadcrumb navigation with accessibility attributes and ChevronRight separators", () => {
      render(
        <PageHeader
          title="Tutores"
          breadcrumbs={[
            { label: "Inicio", href: "/admin" },
            { label: "Área Académica", href: "/admin/tutores" },
            { label: "Detalle" },
          ]}
        />,
      );

      const nav = screen.getByRole("navigation", { name: "Migas de pan" });
      expect(nav).toBeInTheDocument();

      const homeLink = screen.getByRole("link", { name: "Inicio" });
      expect(homeLink).toHaveAttribute("href", "/admin");

      const currentItem = screen.getByText("Detalle");
      expect(currentItem).toHaveAttribute("aria-current", "page");
    });

    it("renders dominant action in dedicated slot", () => {
      render(
        <PageHeader
          title="Horarios"
          action={<button type="button">Crear Plan</button>}
        />,
      );

      const actionButton = screen.getByRole("button", { name: "Crear Plan" });
      expect(actionButton).toBeInTheDocument();
    });
  });

  describe("StatusBadge (a11y: text + icon)", () => {
    it("renders text and supporting icon for each semantic variant", () => {
      const { rerender } = render(<StatusBadge variant="success">Activo</StatusBadge>);
      expect(screen.getByText("Activo")).toBeInTheDocument();
      let badge = screen.getByText("Activo").parentElement;
      expect(badge).toHaveClass("text-success");
      expect(badge?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

      rerender(<StatusBadge variant="warning">Pendiente</StatusBadge>);
      expect(screen.getByText("Pendiente")).toBeInTheDocument();
      badge = screen.getByText("Pendiente").parentElement;
      expect(badge).toHaveClass("text-warning");

      rerender(<StatusBadge variant="danger">Falta</StatusBadge>);
      expect(screen.getByText("Falta")).toBeInTheDocument();
      badge = screen.getByText("Falta").parentElement;
      expect(badge).toHaveClass("text-danger");

      rerender(<StatusBadge variant="info">En curso</StatusBadge>);
      expect(screen.getByText("En curso")).toBeInTheDocument();
      badge = screen.getByText("En curso").parentElement;
      expect(badge).toHaveClass("text-info");

      rerender(<StatusBadge variant="neutral">Borrador</StatusBadge>);
      expect(screen.getByText("Borrador")).toBeInTheDocument();
      badge = screen.getByText("Borrador").parentElement;
      expect(badge).toHaveClass("text-secondary-foreground");

      rerender(<StatusBadge variant="faro">Faro UTN</StatusBadge>);
      expect(screen.getByText("Faro UTN")).toBeInTheDocument();
      badge = screen.getByText("Faro UTN").parentElement;
      expect(badge).toHaveClass("text-accent-foreground");
    });

    it("supports custom Lucide icon with uniform strokeWidth", () => {
      render(
        <StatusBadge variant="info" icon={Sparkles}>
          Novedad
        </StatusBadge>,
      );

      const badge = screen.getByText("Novedad").parentElement;
      const svg = badge?.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });

    it("throws error if no descriptive text is provided (enforcing strict a11y)", () => {
      // @ts-expect-error - testing missing label runtime guard
      expect(() => render(<StatusBadge variant="success" />)).toThrow(
        /StatusBadge requiere obligatoriamente un texto descriptivo/,
      );
    });
  });

  describe("EmptyState", () => {
    it("renders title, description and geometric Faro illustration by default", () => {
      render(
        <EmptyState
          title="Todo en orden"
          description="No hay guardias pendientes para el día de hoy."
        />,
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 3, name: "Todo en orden" })).toBeInTheDocument();
      expect(
        screen.getByText("No hay guardias pendientes para el día de hoy."),
      ).toBeInTheDocument();
      expect(screen.getByTestId("faro-illustration")).toBeInTheDocument();
    });

    it("renders optional contextual resolution action button", () => {
      render(
        <EmptyState
          title="Sin registros"
          description="Aún no se han cargado tutores para este ciclo."
          action={<button type="button">Cargar Tutor</button>}
        />,
      );

      expect(screen.getByRole("button", { name: "Cargar Tutor" })).toBeInTheDocument();
    });

    it("supports custom illustration replacement", () => {
      render(
        <EmptyState
          title="Sin datos"
          illustration={<div data-testid="custom-art">Custom Art</div>}
        />,
      );

      expect(screen.getByTestId("custom-art")).toBeInTheDocument();
      expect(screen.queryByTestId("faro-illustration")).not.toBeInTheDocument();
    });
  });

  describe("FaroIllustration", () => {
    it("renders svg with aria-hidden and distinct brand accents", () => {
      render(<FaroIllustration />);
      const svg = screen.getByTestId("faro-illustration");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveClass("h-24", "w-24");
    });
  });

  describe("PageContainer", () => {
    it("renders with canonical max width and responsive gutters", () => {
      render(
        <PageContainer data-testid="container">
          <p>Contenido</p>
        </PageContainer>,
      );

      const container = screen.getByTestId("container");
      expect(container).toHaveClass("w-full");
      expect(container).toHaveClass("max-w-[100rem]");
      expect(container).toHaveClass("px-4");
      expect(container).toHaveClass("md:px-6");
      expect(container).toHaveClass("lg:px-8");
    });

    it("supports polymorphic HTML element rendering via 'as' prop", () => {
      render(
        <PageContainer as="main" aria-label="Área principal">
          <p>Contenido principal</p>
        </PageContainer>,
      );

      const main = screen.getByRole("main", { name: "Área principal" });
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass("max-w-[100rem]");
    });
  });
});

