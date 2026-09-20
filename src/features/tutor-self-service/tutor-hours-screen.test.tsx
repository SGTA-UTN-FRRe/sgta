import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TutorHoursScreen } from "./tutor-hours-screen";
import {
  tutorSelfServiceHoursEmpty,
  tutorSelfServiceHoursReady,
  tutorSelfServiceRequiredAction,
} from "./tutor-self-service-screen.fixtures";

describe("TutorHoursScreen", () => {
  it("renders signed balance and read-only movement history", () => {
    render(<TutorHoursScreen data={tutorSelfServiceHoursReady} />);

    expect(screen.getByRole("heading", { level: 1, name: "Mis horas" })).toBeInTheDocument();
    expect(screen.getAllByText("+01:00")).not.toHaveLength(0);
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getByText("Reunión de equipo")).toBeInTheDocument();
    expect(screen.getByText("Reunión de coordinación semanal.")).toBeInTheDocument();

    const history = screen.getByRole("list", { name: "Historial de movimientos" });
    expect(history).toHaveAttribute("data-layout", "movement-history");
    expect(screen.queryByRole("button", { name: /registrar|editar|revertir|eliminar/i })).not.toBeInTheDocument();
  });

  it("exposes loading, empty, required-action, and error states", () => {
    render(
      <TutorHoursScreen data={tutorSelfServiceHoursReady} state="loading" />,
    );
    expect(screen.getByRole("status", { name: "Cargando horas" })).toBeInTheDocument();

    cleanup();
    render(<TutorHoursScreen data={tutorSelfServiceHoursEmpty} state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Todavía no hay movimientos registrados en este ciclo.",
    );

    cleanup();
    render(<TutorHoursScreen data={tutorSelfServiceRequiredAction} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Completar la pertenencia al ciclo",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    cleanup();
    render(
      <TutorHoursScreen
        data={null}
        initialErrorMessage="No se pudieron cargar las horas."
        state="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las horas.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
