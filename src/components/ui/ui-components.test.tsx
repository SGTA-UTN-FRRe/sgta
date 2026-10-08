import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Input } from "./input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

describe("Base shadcn/ui components with SGTA design system", () => {
  describe("Button", () => {
    it("renders default variant with pill shape and primary styling", () => {
      render(<Button>Guardar</Button>);
      const btn = screen.getByRole("button", { name: "Guardar" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass("rounded-full");
      expect(btn).toHaveClass("bg-primary");
      expect(btn).toHaveClass("focus-visible:ring-2");
    });

    it("renders secondary and destructive variants", () => {
      const { rerender } = render(
        <Button variant="secondary">Cancelar</Button>,
      );
      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveClass(
        "bg-secondary",
      );

      rerender(<Button variant="destructive">Eliminar</Button>);
      expect(screen.getByRole("button", { name: "Eliminar" })).toHaveClass(
        "bg-destructive",
      );
    });
  });

  describe("Input", () => {
    it("renders with control height, input boundary and focus ring", () => {
      render(<Input placeholder="Buscar tutor..." />);
      const input = screen.getByPlaceholderText("Buscar tutor...");
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass("h-10");
      expect(input).toHaveClass("rounded-md", "border-input");
      expect(input).toHaveClass("focus-visible:ring-2");
    });

    it("applies tabular-nums when type is number", () => {
      render(<Input type="number" aria-label="Horas" />);
      const input = screen.getByLabelText("Horas");
      expect(input).toHaveClass("tabular-nums");
    });
  });

  describe("Badge", () => {
    it("renders semantic variants with surface colors", () => {
      const { rerender } = render(<Badge variant="success">Activo</Badge>);
      expect(screen.getByText("Activo")).toHaveClass("bg-muted");
      expect(screen.getByText("Activo")).toHaveClass(
        "text-foreground",
        "before:bg-success",
      );
      expect(screen.getByText("Activo")).toHaveClass("rounded-full");

      rerender(<Badge variant="warning">Pendiente</Badge>);
      expect(screen.getByText("Pendiente")).toHaveClass("bg-muted");
      expect(screen.getByText("Pendiente")).toHaveClass(
        "text-foreground",
        "before:bg-warning",
      );

      rerender(<Badge variant="danger">Falta</Badge>);
      expect(screen.getByText("Falta")).toHaveClass("bg-muted");
      expect(screen.getByText("Falta")).toHaveClass(
        "text-foreground",
        "before:bg-destructive",
      );

      rerender(<Badge variant="info">En curso</Badge>);
      expect(screen.getByText("En curso")).toHaveClass("bg-muted");
      expect(screen.getByText("En curso")).toHaveClass(
        "text-foreground",
        "before:bg-info",
      );

      rerender(<Badge variant="neutral">Borrador</Badge>);
      expect(screen.getByText("Borrador")).toHaveClass(
        "bg-muted",
        "text-foreground",
      );
    });
  });

  describe("Card", () => {
    it("renders with panel radius and surface styling", () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>Detalle del ciclo</CardDescription>
          </CardHeader>
          <CardContent>Contenido</CardContent>
        </Card>,
      );

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("rounded-xl");
      expect(card).toHaveClass("bg-card");
      expect(screen.getByText("Resumen")).toBeInTheDocument();
      expect(screen.getByText("Detalle del ciclo")).toBeInTheDocument();
      expect(screen.getByText("Contenido")).toBeInTheDocument();
    });
  });

  describe("Table", () => {
    it("enforces tabular-nums and font-sans for column alignment", () => {
      render(
        <Table data-testid="table">
          <TableHeader>
            <TableRow>
              <TableHead>Tutor</TableHead>
              <TableHead>Horas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Husak, Guillermo</TableCell>
              <TableCell>+12.5</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );

      const table = screen.getByTestId("table");
      expect(table).toHaveClass("tabular-nums");
      expect(table).toHaveClass("font-sans");
      expect(screen.getByText("Husak, Guillermo")).toBeInTheDocument();
      expect(screen.getByText("+12.5")).toBeInTheDocument();
    });
  });
});
