import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";

import { SettingsScreen } from "./settings-screen";

const currentCycle: SafeAdministrativeCycle = {
  id: "cycle-1",
  name: "Ciclo 2026",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  status: "OPEN",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const closedCycle: SafeAdministrativeCycle = {
  ...currentCycle,
  status: "CLOSED",
  updatedAt: "2026-09-16T12:00:00.000Z",
};

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("SettingsScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("shows the required action state when no cycle is open", () => {
    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    expect(document.querySelector('[data-slot="settings-screen"]')).toHaveAttribute(
      "data-state",
      "required-action",
    );
    expect(screen.getByText(/Todavía no hay un ciclo abierto/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear ciclo" })).toBeEnabled();
  });

  it("creates a cycle and announces success", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ cycle: currentCycle }, { status: 201 }),
    );

    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    await user.type(screen.getByLabelText("Nombre"), "Ciclo 2026");
    await user.type(screen.getByLabelText("Fecha de inicio"), "2026-01-01");
    await user.type(
      screen.getByLabelText("Fecha de finalización"),
      "2026-12-31",
    );
    await user.click(screen.getByRole("button", { name: "Crear ciclo" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "El ciclo se creó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/cycles",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Ciclo 2026",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
        }),
      }),
    );
    expect(screen.getByRole("button", { name: "Cerrar ciclo" })).toBeInTheDocument();
  });

  it("requires confirmation before closing and preserves the history", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ cycle: closedCycle }, { status: 200 }),
    );

    render(<SettingsScreen currentCycle={currentCycle} cycles={[currentCycle]} />);

    await user.click(screen.getByRole("button", { name: "Cerrar ciclo" }));

    const confirmation = screen.getByRole("alertdialog", {
      name: "Confirmar cierre del ciclo",
    });
    expect(confirmation).toHaveTextContent("El historial permanecerá disponible");
    expect(confirmation).toHaveTextContent("saldo de horas cero");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Confirmar cierre" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "El ciclo se cerró correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/cycles/cycle-1/close",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.queryByRole("button", { name: "Cerrar ciclo" })).not.toBeInTheDocument();
    expect(screen.getByText("Cerrado")).toBeInTheDocument();
  });

  it("maps API conflicts to actionable recovery copy", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ error: "open_cycle_exists" }, { status: 409 }),
    );

    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    await user.type(screen.getByLabelText("Nombre"), "Ciclo 2027");
    await user.type(screen.getByLabelText("Fecha de inicio"), "2027-01-01");
    await user.type(
      screen.getByLabelText("Fecha de finalización"),
      "2027-12-31",
    );
    await user.click(screen.getByRole("button", { name: "Crear ciclo" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Ya existe un ciclo abierto.",
      ),
    );
  });
});
