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

  it("preserves a tutor deep link when that tutor has no movements", () => {
    const tutorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    renderHistory({ initialTutorId: tutorId });
    expect(screen.getByLabelText("Tutor")).toHaveValue(tutorId);
    expect(screen.getByRole("option", { name: "Tutor seleccionado" })).toBeInTheDocument();
    expect(new URL(window.location.href).searchParams.get("tutorId")).toBe(tutorId);
    expect(screen.queryByRole("list", { name: "Historial de movimientos" })).not.toBeInTheDocument();
  });

  it("renders newest-first movements with origins and visible reversal relationships", () => {
    renderHistory();

    const list = screen.getByRole("list", { name: "Historial de movimientos" });
    const rows = within(list).getAllByRole("listitem");

    expect(screen.getAllByText("Duración")).not.toHaveLength(0);
    expect(screen.queryByText("Duración firmada")).not.toBeInTheDocument();
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
    expect(within(original!).getAllByText("Ver reversión vinculada")[1]).toHaveAttribute(
      "href",
      "#movement-cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    );
    expect(within(reversal!).getAllByText("Ver movimiento original")[1]).toHaveAttribute(
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

    await user.selectOptions(screen.getByLabelText("Origen"), "");
    await user.selectOptions(screen.getByLabelText("Estado"), "REVERSAL");
    expect(within(filteredList).getAllByText("Reversión")).not.toHaveLength(0);
    expect(within(filteredList).queryByText("Confirmado")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Estado"), "");
    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "cobertura");
    expect(within(filteredList).getByText("Acosta, Tomás")).toBeInTheDocument();
    expect(within(filteredList).queryByText("Funes, Lucía")).not.toBeInTheDocument();
  });

  it("preserves category and tutor URL filters and clears them without changing the cycle", async () => {
    const user = userEvent.setup();
    const movement = data.history[0];
    renderHistory({ initialTutorId: movement.tutor.id, initialCategoryId: movement.category.id });
    expect(screen.getByLabelText("Tutor")).toHaveValue(movement.tutor.id);
    expect(screen.getByLabelText("Categoría")).toHaveValue(movement.category.id);
    const params = new URL(window.location.href).searchParams;
    expect(params.get("tutorId")).toBe(movement.tutor.id);
    expect(params.get("categoryId")).toBe(movement.category.id);
    await user.selectOptions(screen.getByLabelText("Dirección"), movement.direction);
    const rows = within(screen.getByRole("list", { name: "Historial de movimientos" })).getAllByRole("listitem");
    expect(rows.every((row) => row.textContent?.includes(movement.direction === "CREDIT" ? "Crédito" : "Débito"))).toBe(true);
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(new URL(window.location.href).searchParams.toString()).toBe(`cycleId=${cycle.id}`);
    expect(within(screen.getByRole("list", { name: "Historial de movimientos" })).getAllByRole("listitem")).toHaveLength(data.history.length);
  });

  it("gives Wide and Compact relationships distinct anchors to their matching rows", () => {
    renderHistory();
    const table = screen.getByRole("table", { name: "Historial de movimientos" });
    const list = screen.getByRole("list", { name: "Historial de movimientos" });
    for (const [container, suffix] of [[table, "-table"], [list, ""]] as const) {
      const firstRow = container.querySelector(`[data-movement-id="${data.history[0].id}"]`);
      expect(firstRow).toHaveAttribute("id", `movement-${data.history[0].id}${suffix}`);
      for (const movement of data.history.filter((row) => row.reversalState !== "CONFIRMED")) {
        const row = container.querySelector(`[data-movement-id="${movement.id}"]`)!;
        const targetId = movement.reversalMovementId ?? movement.reversalOfMovementId;
        const href = `#movement-${targetId}${suffix}`;
        expect(row.querySelector(`a[href="${href}"]`)).toBeInTheDocument();
        expect(container.querySelector(`[id="${href.slice(1)}"]`)).toBeInTheDocument();
      }
    }
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("replaces a relationship link with an explanation when filters hide the linked row", async () => {
    const user = userEvent.setup();
    renderHistory();

    await user.selectOptions(screen.getByLabelText("Estado"), "REVERSAL");
    const list = screen.getByRole("list", { name: "Historial de movimientos" });
    expect(within(list).queryByText("Ver movimiento original")).not.toBeInTheDocument();
    expect(within(list).getAllByText("El movimiento vinculado no aparece con los filtros actuales.")).not.toHaveLength(0);
    expect(within(list).getAllByText("Esta fila compensa un movimiento anterior y no puede revertirse otra vez.")).not.toHaveLength(0);
  });

  it("opens, cancels, and returns focus from the reversal dialog", async () => {
    const user = userEvent.setup();
    renderHistory();

    const trigger = within(screen.getByRole("list", { name: "Historial de movimientos" })).getByRole("button", {
      name: "Revertir movimiento de Benítez, Marina del 15/09/2026",
    });
    await user.click(trigger);

    const dialog = screen.getByRole("alertdialog", { name: "Revertir movimiento" });
    expect(within(dialog).getByText(/el original permanecerá visible como revertido/)).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(dialog).getByRole("button", {
          name: "Cancelar",
        }),
      ),
    );

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog", { name: "Revertir movimiento" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog", { name: "Revertir movimiento" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("disables filters inside the Compact portal while a cycle is loading", async () => {
    const user = userEvent.setup();
    const otherCycle = { ...cycle, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "2025", status: "CLOSED" as const };
    let finishRequest!: (response: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { finishRequest = resolve; }));
    renderHistory({ cycles: [cycle, otherCycle] });
    await user.click(screen.getByRole("button", { name: "Filtros" }));
    const filters = within(screen.getByRole("dialog", { name: "Filtros" }));
    await user.selectOptions(filters.getByLabelText("Ciclo"), otherCycle.id);
    for (const control of filters.getAllByRole("combobox")) expect(control).toBeDisabled();
    finishRequest(Response.json({ movements: [] }));
    await waitFor(() => expect(filters.getByLabelText("Ciclo")).toBeEnabled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    const trigger = within(screen.getByRole("list", { name: "Historial de movimientos" })).getByRole("button", {
      name: "Revertir movimiento de Benítez, Marina del 15/09/2026",
    });
    await user.click(trigger);
    await user.click(
      screen.getByRole("button", { name: "Confirmar reversión" }),
    );

    await waitFor(() =>
      expect(screen.getAllByRole("status").find((element) => element.textContent?.includes("Reversión registrada"))).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alertdialog", { name: "Revertir movimiento" })).not.toBeInTheDocument();
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
      within(screen.getByRole("list", { name: "Historial de movimientos" })).getByRole("button", {
        name: "Revertir movimiento de Benítez, Marina del 15/09/2026",
      }),
    );
    const dialog = screen.getByRole("alertdialog", { name: "Revertir movimiento" });
    await user.click(within(dialog).getByRole("button", { name: "Confirmar reversión" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "No se registró la reversión. El movimiento ya tiene una reversión registrada.",
      ),
    );
    expect(screen.getByRole("alertdialog", { name: "Revertir movimiento" })).toBeInTheDocument();
    expect(within(dialog).getByText("Benítez, Marina")).toBeInTheDocument();
    fetchMock.mockResolvedValue(Response.json({ error: "internal_server_error" }, { status: 500 }));
    await user.click(within(dialog).getByRole("button", { name: "Confirmar reversión" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("No se pudo completar la operación. Intentar nuevamente.");
    expect(within(dialog).getByText("Benítez, Marina")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
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
    expect(screen.getByRole("heading", { name: "Todavía no hay movimientos" })).toBeInTheDocument();

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
