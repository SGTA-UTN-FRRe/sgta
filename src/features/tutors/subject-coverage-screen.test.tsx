import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SubjectCoverageScreen } from "./subject-coverage-screen";

const currentCycle = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN" as const,
};

describe("SubjectCoverageScreen", () => {
  it("renders a required action without inventing a cycle or planned hours", () => {
    render(<SubjectCoverageScreen data={{ currentCycle: null, subjects: [] }} />);

    expect(screen.getByRole("heading", { name: "Materias" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Configurar ciclo" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );
    expect(screen.getByText(/ciclo abierto/)).toBeInTheDocument();
    expect(screen.queryByText(/horas planificadas/i)).not.toBeInTheDocument();
  });

  it("renders canonical subject coverage and tutor status", () => {
    render(
      <SubjectCoverageScreen
        data={{
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
              ],
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("table", { name: "Cobertura de materias" })).toBeInTheDocument();
    expect(screen.getByText("Álgebra")).toBeInTheDocument();
    expect(screen.getByText("Benítez, Marina")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });
});
