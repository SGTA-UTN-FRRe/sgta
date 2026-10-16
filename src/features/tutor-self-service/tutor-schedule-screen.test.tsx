import { cleanup, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByText("Consultar las guardias asignadas del ciclo vigente.")).toBeInTheDocument();
    expect(screen.getByLabelText("Contexto del horario")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de referencia")).toHaveValue("2026-09-21");
    expect(screen.getByText("Plan Regular")).toBeInTheDocument();
    expect(screen.getByText("16:00 a 18:00")).toBeInTheDocument();
    expect(screen.getByText("Presencial · Aula 204")).toBeInTheDocument();
    expect(
      screen.getByText("Guardia · 16:00 a 18:00 · Presencial · Aula 204"),
    ).toBeInTheDocument();

    const layout = screen.getByRole("list", { name: "Vista semanal de guardias" });
    expect(layout).toHaveAttribute("data-layout", "schedule-day-list-week");
    expect(layout.className).toContain("md:grid-cols-2");
    expect(layout.className).toContain("lg:grid-cols-4");
    expect(layout.className).toContain("xl:grid-cols-7");
    expect(screen.queryByRole("button", { name: /editar|eliminar|revertir/i })).not.toBeInTheDocument();
  });

  it("shows the shared recovery cue and normalized virtual modality", () => {
    const virtualRecoverySchedule = {
      ...tutorSelfServiceScheduleReady,
      days: tutorSelfServiceScheduleReady.days.map((day) => ({
        ...day,
        assignments: day.assignments.map((assignment) => ({
          ...assignment,
          kind: "RECOVERY" as const,
          modality: "Zoom",
        })),
      })),
    } satisfies typeof tutorSelfServiceScheduleReady;

    render(<TutorScheduleScreen data={virtualRecoverySchedule} />);

    expect(screen.getByText("Recuperación")).toBeInTheDocument();
    expect(screen.getByText("Virtual · Zoom")).toBeInTheDocument();
    expect(
      screen.getByText("Recuperación · 16:00 a 18:00 · Virtual · Zoom"),
    ).toBeInTheDocument();
  });

  it("labels each day once and states the period range", () => {
    render(<TutorScheduleScreen data={tutorSelfServiceScheduleReady} />);

    const week = screen.getByRole("list", { name: "Vista semanal de guardias" });
    expect(within(week).getByText("lunes")).toBeInTheDocument();
    expect(within(week).queryByText(/lunes,/i)).not.toBeInTheDocument();
    expect(
      within(week).getByText("21 de septiembre", { selector: "time" }),
    ).toHaveAttribute("dateTime", "2026-09-21");
    expect(screen.getByText("1 guardia")).toBeInTheDocument();
    expect(screen.getByText(/^Del/)).toHaveTextContent("Del 21 de septiembre al 27 de septiembre");
  });

  it("lists upcoming assignments from the next duty onward", () => {
    render(
      <TutorScheduleScreen data={{ ...tutorSelfServiceScheduleReady, nextDuty: null }} />,
    );

    expect(screen.getByText("16:00 a 18:00")).toBeInTheDocument();
    expect(screen.getByText("No hay guardias próximas en esta consulta.")).toBeInTheDocument();
    expect(
      screen.queryByText("Guardia · 16:00 a 18:00 · Presencial · Aula 204"),
    ).not.toBeInTheDocument();
  });

  it("keeps the reference date available when the period is empty", () => {
    render(<TutorScheduleScreen data={tutorSelfServiceScheduleEmpty} state="empty" />);

    expect(screen.getByLabelText("Fecha de referencia")).toHaveValue("2026-09-21");
    expect(screen.getByRole("button", { name: "Consultar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Próximas guardias" })).not.toBeInTheDocument();
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
