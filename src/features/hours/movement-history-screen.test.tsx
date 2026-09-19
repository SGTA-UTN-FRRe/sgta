import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hoursScreenData, hoursStateFixtures } from "@/mocks/hours.mock";

import { MovementHistoryScreen } from "./movement-history-screen";

const cycle = {
  ...hoursScreenData.currentCycle,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};
const data = hoursScreenData;
const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function renderHistory(overrides: Partial<React.ComponentProps<typeof MovementHistoryScreen>> = {}) {
  return render(
    <MovementHistoryScreen
      cycles={[cycle]}
      dataDescription="Consultar movimientos persistidos."
      initialCycleId={cycle.id}
      initialMovements={data.history}
      {...overrides}
    />,
  );
}

describe("MovementHistoryScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders newest-first movements with origins and visible reversal relationships", () => {
    renderHistory();

    const list = screen.getByRole("list", { name: "Historial de movimientos" });
    const rows = within(list).getAllByRole("listitem");

    expect(rows[0]).toHaveAttribute(
      "data-movement-id",
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(rows[1]).toHaveAttribute(
      "data-movement-id",
      "88888888-8888-4888-8888-888888888888",
    );
    expect(within(rows[1]).getByText(/Origen registrado por/)).toBeInTheDocument();

    const original = document.getElementById(
      "movement-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    const reversal = document.getElementById(
      "movement-cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );

    expect(original).not.toBeNull();
    expect(reversal).not.toBeNull();
    expect(within(original!).getByText("Ver reversión vinculada")).toHaveAttribute(
      "href",
      "#movement-cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(within(reversal!).getByText("Ver movimiento original")).toHaveAttribute(
      "href",
      "#movement-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    expect(within(original!).queryByRole("button", { name: /Revertir movimiento/ })).not.toBeInTheDocument();
    expect(within(reversal!).queryByRole("button", { name: /Revertir movimiento/ })).not.toBeInTheDocument();
  });

  it("filters by tutor, source, direction, reversal state, and text", async () => {
    const user = userEvent.setup();
    renderHistory();

    await user.selectOptions(
      screen.getByLabelText("Origen"),
      "EXTRAORDINARY",
    );
    const filteredList = screen.getByRole("list", { name: "Historial de movimientos" });
    expect(within(filteredList).getByText("Funes, Lucía")).toBeInTheDocument();
    expect(within(filteredList).queryByText("Benítez, Marina")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Origen"), "ALL");
    await user.selectOptions(screen.getByLabelText("Estado"), "REVERSAL");
    expect(within(filteredList).getAllByText("Reversión")).not.toHaveLength(0);
    expect(within(filteredList).queryByText("Confirmado")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Estado"), "ALL");
    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "cobertura");
    expect(within(filteredList).getByText("Acosta, Tomás")).toBeInTheDocument();
    expect(within(filteredList).queryByText("Funes, Lucía")).not.toBeInTheDocument();
  });

  it("opens, cancels, and returns focus from the reversal dialog", async () => {
    const user = userEvent.setup();
    renderHistory();

    const trigger = screen.getByRole("button", {
      name: "Revertir movimiento de Benítez, Marina del 15/09/2026",
    });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Revertir movimiento" });
    expect(within(dialog).getByText(/el original permanecerá visible como revertido/)).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole("button", {
          name: "Cerrar confirmación de reversión",
        }),
      ),
    );

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Revertir movimiento" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Revertir movimiento" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("confirms a reversal and renders the unchanged original with its new linked row", async () => {
    const user = userEvent.setup();
    const target = data.history.find((movement) => movement.id.startsWith("8888"))!;
    const reversalId = "abababab-abab-4aba-8bab-abababababab";
    const result = {
      original: {
        ...target,
        reversalMovementId: reversalId,
        reversalState: "REVERSED" as const,
      },
      reversal: {
        ...target,
        id: reversalId,
        direction: "DEBIT" as const,
        signedDurationMinutes: -target.durationMinutes,
        reversalOfMovementId: target.id,
        reversalMovementId: null,
        reversalState: "REVERSAL" as const,
        createdAt: "2026-09-16T12:00:00.000Z",
      },
    };
    fetchMock.mockResolvedValue(Response.json(result, { status: 201 }));

    renderHistory();
    const trigger = screen.getByRole("button", {
      name: "Revertir movimiento de Benítez, Marina del 15/09/2026",
    });
    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: "Confirmar reversión" }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Reversión registrada"),
    );
    expect(screen.queryByRole("dialog", { name: "Revertir movimiento" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/hours/movements/${target.id}/reverse`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(document.getElementById(`movement-${target.id}`)).toHaveAttribute(
      "data-reversal-state",
      "REVERSED",
    );
    expect(document.getElementById(`movement-${reversalId}`)).toHaveAttribute(
      "data-reversal-state",
      "REVERSAL",
    );
  });

  it("keeps the reversal context open when the server rejects the correction", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ error: "movement_already_reversed" }, { status: 409 }),
    );

    renderHistory();
    await user.click(
      screen.getByRole("button", {
        name: "Revertir movimiento de Benítez, Marina del 15/09/2026",
      }),
    );
    const dialog = screen.getByRole("dialog", { name: "Revertir movimiento" });
    await user.click(within(dialog).getByRole("button", { name: "Confirmar reversión" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "No se registró la reversión. El movimiento ya tiene una reversión registrada.",
      ),
    );
    expect(screen.getByRole("dialog", { name: "Revertir movimiento" })).toBeInTheDocument();
    expect(within(dialog).getByText("Benítez, Marina")).toBeInTheDocument();
  });

  it("exposes loading, empty, error, and required-action states", () => {
    const error = hoursStateFixtures.find((fixture) => fixture.state === "error")!;
    const required = hoursStateFixtures.find(
      (fixture) => fixture.state === "required-action",
    )!;
    const loadingView = renderHistory({ initialState: "loading" });

    expect(screen.getByRole("status", { name: "Cargando movimientos" })).toBeInTheDocument();

    loadingView.unmount();
    const emptyView = renderHistory({ initialMovements: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay movimientos");

    emptyView.unmount();
    const errorView = render(
      <MovementHistoryScreen
        cycles={[cycle]}
        dataDescription="Consultar movimientos persistidos."
        initialCycleId={cycle.id}
        initialErrorMessage="No se pudo cargar el historial."
        initialMovements={[]}
        initialState="error"
        initialStateDetail={error}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el historial.");

    errorView.unmount();
    render(
      <MovementHistoryScreen
        cycles={[]}
        dataDescription="Consultar movimientos persistidos."
        initialCycleId={null}
        initialMovements={[]}
        initialState="required-action"
        initialStateDetail={required}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(required.title);
  });
});
