import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TutorScheduleScreen } from "./tutor-schedule-screen";
import {
  tutorSelfServiceRequiredAction,
  tutorSelfServiceScheduleEmpty,
  tutorSelfServiceScheduleReady,
} from "./tutor-self-service-screen.fixtures";

describe("TutorScheduleScreen", () => {
  it("renders chronological and week layouts with read-only schedule data", () => {
    render(
      <TutorScheduleScreen
        data={tutorSelfServiceScheduleReady}
        initialDate="2026-09-21"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Mi horario" })).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de referencia")).toHaveValue("2026-09-21");
    expect(screen.getByText("Plan Regular")).toBeInTheDocument();
    expect(screen.getByText("16:00 a 18:00")).toBeInTheDocument();

    const layout = screen.getByRole("list", { name: "Vista semanal de guardias" });
    expect(layout).toHaveAttribute("data-layout", "schedule-day-list-week");
    expect(layout.className).toContain("md:grid-cols-7");
    expect(screen.queryByRole("button", { name: /editar|eliminar|asistencia|revertir/i })).not.toBeInTheDocument();
  });

  it("exposes loading, empty, required-action, and error states", () => {
    render(
      <TutorScheduleScreen data={tutorSelfServiceScheduleReady} state="loading" />,
    );
    expect(screen.getByRole("status", { name: "Cargando horario" })).toBeInTheDocument();

    cleanup();
    render(<TutorScheduleScreen data={tutorSelfServiceScheduleEmpty} state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No hay guardias asignadas en el período actual.",
    );

    cleanup();
    render(<TutorScheduleScreen data={tutorSelfServiceRequiredAction} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Completar la pertenencia al ciclo",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    cleanup();
    render(
      <TutorScheduleScreen
        data={null}
        initialErrorMessage="No se pudo cargar el horario."
        state="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el horario.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
