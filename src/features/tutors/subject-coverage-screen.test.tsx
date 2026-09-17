import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SafeSubjectCoverageResult } from "./tutor-service";
import { SubjectCoverageScreen } from "./subject-coverage-screen";

const currentCycle = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN" as const,
};

const coverage: SafeSubjectCoverageResult = {
  currentCycle,
  subjects: [
    {
      subject: {
        id: "44444444-4444-4444-8444-444444444444",
        name: "Álgebra",
        status: "ACTIVE",
      },
      career: {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Ingeniería en Sistemas",
        status: "ACTIVE",
      },
      tutors: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          formalName: "Benítez, Marina",
          firstName: "Marina",
          lastName: "Benítez",
          preferredDisplayName: null,
          institutionalIdentifier: null,
          status: "ACTIVE",
        },
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          formalName: "Sosa, Diego",
          firstName: "Diego",
          lastName: "Sosa",
          preferredDisplayName: null,
          institutionalIdentifier: null,
          status: "INACTIVE",
        },
      ],
    },
  ],
};

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("SubjectCoverageScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    window.history.replaceState({}, "", "/admin/tutors/subjects");
  });

  it("renders responsive derived coverage with cycle context and historical status", () => {
    render(<SubjectCoverageScreen data={coverage} />);

    expect(document.querySelector('[data-slot="subject-coverage-screen"]')).toHaveAttribute(
      "data-state",
      "default",
    );
    expect(screen.getByRole("heading", { name: "Materias" })).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getAllByText("Álgebra")).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "Ver tutor Benítez, Marina" })).toHaveLength(3);
    expect(screen.getAllByText("Inactivo")).toHaveLength(3);
    expect(screen.getAllByText("Ciclo 2026")).not.toHaveLength(0);
    expect(screen.getByText(/No disponibles en esta vista/)).toBeInTheDocument();
    expect(screen.queryByText(/horas planificadas.*0/i)).not.toBeInTheDocument();
    const tutorNavigationLinks = screen.getAllByRole("link", { name: "Ver tutores" });
    expect(tutorNavigationLinks).toHaveLength(2);
    tutorNavigationLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/admin/tutors");
    });
  });

  it("supports search-empty recovery without changing the canonical data", async () => {
    const user = userEvent.setup();
    render(<SubjectCoverageScreen data={coverage} />);

    await user.type(
      screen.getByRole("searchbox", { name: "Buscar materia, carrera o tutor" }),
      "Química",
    );

    await waitFor(() => {
      expect(document.querySelector('[data-slot="subject-coverage-screen"]')).toHaveAttribute(
        "data-state",
        "search-empty",
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("No encontramos cobertura");
    expect(screen.queryByText("Álgebra")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    await waitFor(() => {
      expect(document.querySelector('[data-slot="subject-coverage-screen"]')).toHaveAttribute(
        "data-state",
        "default",
      );
    });
    expect(screen.getAllByText("Álgebra")).toHaveLength(3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the required cycle action without inventing coverage or hours", () => {
    render(<SubjectCoverageScreen data={{ currentCycle: null, subjects: [] }} />);

    expect(document.querySelector('[data-slot="subject-coverage-screen"]')).toHaveAttribute(
      "data-state",
      "required-action",
    );
    expect(screen.getAllByRole("link", { name: "Configurar ciclo" })).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("ciclo abierto");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/horas planificadas/i)).not.toBeInTheDocument();
  });

  it("renders the empty state with navigation to the canonical tutor workflow", () => {
    render(<SubjectCoverageScreen data={{ currentCycle, subjects: [] }} />);

    expect(document.querySelector('[data-slot="subject-coverage-screen"]')).toHaveAttribute(
      "data-state",
      "empty",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay cobertura");
    expect(screen.getByRole("link", { name: "Gestionar tutores" })).toHaveAttribute(
      "href",
      "/admin/tutors",
    );
  });

  it("shows a loading skeleton and recovers from a server error", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SubjectCoverageScreen data={coverage} state="loading" key="loading" />,
    );

    expect(screen.getByRole("status", { name: "Cargando cobertura de materias" })).toBeInTheDocument();

    fetchMock.mockResolvedValue(
      Response.json({ error: "internal_server_error" }, { status: 500 }),
    );
    rerender(
      <SubjectCoverageScreen
        data={coverage}
        errorMessage="No se pudo cargar la cobertura. Reintentar para volver a consultar las materias."
        state="error"
        key="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la cobertura");

    fetchMock.mockResolvedValueOnce(Response.json({ coverage }));
    await user.click(screen.getAllByRole("button", { name: "Reintentar" })[0]);

    await waitFor(() => {
      expect(document.querySelector('[data-slot="subject-coverage-screen"]')).toHaveAttribute(
        "data-state",
        "default",
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/tutors/subjects",
      expect.objectContaining({ headers: { accept: "application/json" } }),
    );
  });

  it("remains read-only and exposes no Materias mutation controls", () => {
    render(<SubjectCoverageScreen data={coverage} />);

    expect(screen.queryByRole("button", { name: /agregar materia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /eliminar/i })).not.toBeInTheDocument();
  });
});
