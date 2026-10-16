import { cleanup, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TutorHoursScreen } from "./tutor-hours-screen";
import {
  tutorSelfServiceHoursEmpty,
  tutorSelfServiceHoursReady,
  tutorSelfServiceRequiredAction,
} from "./tutor-self-service-screen.fixtures";

describe("TutorHoursScreen", () => {
  it("formats the balance and movement history while keeping it read-only", () => {
    render(<TutorHoursScreen data={tutorSelfServiceHoursReady} />);

    expect(screen.getByRole("heading", { level: 1, name: "Mis horas" })).toBeInTheDocument();
    expect(screen.getByText("Saldo del ciclo")).toBeInTheDocument();
    expect(screen.getByText("Saldo de horas y movimientos del ciclo.")).toBeInTheDocument();
    expect(screen.getByText("1 h")).toBeInTheDocument();
    expect(screen.getAllByText("+1 h")).not.toHaveLength(0);
    expect(screen.getByText("Al día")).toBeInTheDocument();
    expect(screen.getAllByText("Reunión de equipo")).not.toHaveLength(0);
    expect(screen.getAllByText("Reunión de coordinación semanal.")).not.toHaveLength(0);

    expect(
      screen.getByRole("list", { name: "Historial de movimientos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Historial de movimientos" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar|editar|revertir|eliminar/i })).not.toBeInTheDocument();
  });

  it("keeps links between reversals in both responsive history layouts", () => {
    const movement = tutorSelfServiceHoursReady.movements[0];
    if (!movement) {
      throw new Error("Expected the fixture to contain a movement.");
    }

    const reversalId = "99999999-9999-4999-8999-999999999999";
    const reversal = {
      ...movement,
      direction: "DEBIT" as const,
      id: reversalId,
      movementDate: "2026-09-23",
      note: null,
      reversalMovementId: null,
      reversalOfMovementId: movement.id,
      reversalState: "REVERSAL" as const,
      signedDurationMinutes: -movement.durationMinutes,
    };
    const data = {
      ...tutorSelfServiceHoursReady,
      movements: [
        reversal,
        {
          ...movement,
          reversalMovementId: reversal.id,
          reversalState: "REVERSED" as const,
        },
      ],
    };

    render(<TutorHoursScreen data={data} />);

    const layouts = [
      ["table", screen.getByRole("table", { name: "Historial de movimientos" })],
      ["list", screen.getByRole("list", { name: "Historial de movimientos" })],
    ] as const;

    for (const [layout, history] of layouts) {
      const linkTargets = (name: string) =>
        within(history)
          .getAllByRole("link", { name })
          .map((link) => link.getAttribute("href"));

      expect(linkTargets("Ver reversión vinculada")).toContain(
        `#tutor-movement-${reversal.id}-${layout}`,
      );
      expect(linkTargets("Ver movimiento original")).toContain(
        `#tutor-movement-${movement.id}-${layout}`,
      );
      expect(document.getElementById(`tutor-movement-${reversal.id}-${layout}`)).not.toBeNull();
      expect(document.getElementById(`tutor-movement-${movement.id}-${layout}`)).not.toBeNull();
    }
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

  it("states a load error once and keeps a specific reason as its description", () => {
    render(<TutorHoursScreen data={null} state="error" />);
    expect(
      screen.getByRole("heading", { level: 2, name: "No se pudieron cargar las horas" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No se pudieron cargar las horas. Intentar nuevamente."),
    ).not.toBeInTheDocument();

    cleanup();
    render(
      <TutorHoursScreen
        data={null}
        initialErrorMessage="La sesión expiró. Volver a iniciar sesión para continuar."
        state="error"
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No se pudieron cargar las horas" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La sesión expiró. Volver a iniciar sesión para continuar."),
    ).toBeInTheDocument();
  });
});
