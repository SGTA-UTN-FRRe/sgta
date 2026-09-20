import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TutorSummaryScreen } from "./tutor-summary-screen";
import {
  tutorSelfServiceRequiredAction,
  tutorSelfServiceSummaryEmpty,
  tutorSelfServiceSummaryReady,
} from "./tutor-self-service-screen.fixtures";

describe("TutorSummaryScreen", () => {
  it("renders the owner-scoped summary without administrative controls", () => {
    render(<TutorSummaryScreen data={tutorSelfServiceSummaryReady} />);

    expect(screen.getByRole("heading", { level: 1, name: "Mi resumen" })).toBeInTheDocument();
    expect(screen.getByText("-01:15")).toBeInTheDocument();
    expect(screen.getByText("Debe horas")).toBeInTheDocument();
    expect(screen.getByText(/Estado actual de Marina Benítez/)).toBeInTheDocument();
    expect(screen.getByText("Arquitectura de Computadoras")).toBeInTheDocument();
    expect(screen.getByText("Beca de acompañamiento")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /administr/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar|editar|revertir/i })).not.toBeInTheDocument();
  });

  it("exposes loading, empty, required-action, and error states", () => {
    render(
      <TutorSummaryScreen data={tutorSelfServiceSummaryReady} state="loading" />,
    );
    expect(screen.getByRole("status", { name: "Cargando resumen" })).toBeInTheDocument();

    cleanup();
    render(<TutorSummaryScreen data={tutorSelfServiceSummaryEmpty} state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Todavía no hay información de resumen",
    );

    cleanup();
    render(<TutorSummaryScreen data={tutorSelfServiceRequiredAction} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Completar la pertenencia al ciclo",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    cleanup();
    render(
      <TutorSummaryScreen
        data={null}
        initialErrorMessage="No se pudo cargar el resumen."
        state="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el resumen.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
