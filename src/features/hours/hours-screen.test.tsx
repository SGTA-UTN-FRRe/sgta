import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hoursScreenData, hoursStateFixtures } from "@/mocks/hours.mock";

import { HoursScreen } from "./hours-screen";

const data = hoursScreenData;
const hourStates = hoursStateFixtures;
const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

function workspaceResponse(overrides: Partial<typeof data> = {}) {
  return {
    currentCycle: overrides.currentCycle ?? data.currentCycle,
    balances: overrides.balances ?? data.balances,
    eligibleTutors: overrides.eligibleTutors ?? data.eligibleTutors,
    categories: overrides.categories ?? data.categories,
  };
}

describe("HoursScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders unsigned balances with text statuses in a shared table and Compact list", () => {
    render(<HoursScreen data={data} />);

    expect(screen.getByRole("heading", { level: 1, name: "Horas" })).toBeInTheDocument();
    expect(screen.getByText(data.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar movimiento" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar tutor" })).toHaveAttribute(
      "placeholder",
      data.searchPlaceholder,
    );
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getAllByText("2 h 30 min")).not.toHaveLength(0);
    expect(screen.getAllByText("Al día")).not.toHaveLength(0);
    expect(screen.getAllByText("Debe horas")).not.toHaveLength(0);
    const name = data.balances[0].tutor.formalName;
    const links = screen.getAllByRole("link", { name: `Ver tutor ${name}` });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", `/admin/tutors?search=${encodeURIComponent(name)}`);
    }
  });

  it("filters live balances by search, status, and category", async () => {
    const user = userEvent.setup();
    render(<HoursScreen data={data} />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar tutor" }), "Lucía");

    expect(screen.queryByText("Benítez, Marina")).not.toBeInTheDocument();
    expect(screen.getAllByText("Funes, Lucía")).not.toHaveLength(0);

    await user.clear(screen.getByRole("searchbox", { name: "Buscar tutor" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "owes");

    expect(screen.queryByText("Benítez, Marina")).not.toBeInTheDocument();
    expect(screen.getAllByText("Acosta, Tomás")).not.toHaveLength(0);

    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Categoría" }),
      data.categories.find((category) => category.name === "Actividad extraordinaria")!.id,
    );

    expect(screen.queryByText("Acosta, Tomás")).not.toBeInTheDocument();
    expect(screen.getAllByText("Funes, Lucía")).not.toHaveLength(0);
  });

  it("opens the transaction dialog with a complete confirmation summary", async () => {
    const user = userEvent.setup();
    render(<HoursScreen data={data} />);

    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));

    const dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    expect(within(dialog).getByText("Dirección")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Categoría")).toHaveValue(data.categories[0].id);
    expect(within(dialog).getByLabelText("Horas")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Minutos")).toHaveValue(30);
    expect(within(dialog).getByLabelText("Fecha")).toHaveValue("2026-08-01");
    expect(within(dialog).getByLabelText("Nota")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Registrar movimiento · Crédito · Reunión de equipo · Reunión · 1 h 30 min · 3 tutores · 01/08/2026",
      ),
    ).toBeInTheDocument();

    await user.selectOptions(
      within(dialog).getByLabelText("Categoría"),
      data.categories.find((category) => category.name === "Guardia")!.id,
    );
    await user.click(within(dialog).getByRole("radio", { name: "Débito" }));

    expect(
      within(dialog).getByText(/Débito · Guardia · Carga manual · 1 h 30 min · 3 tutores · 01\/08\/2026/),
    ).toBeInTheDocument();
  });

  it("keeps the movement draft after dismissal and guards reloads while the dialog has edits", async () => {
    const user = userEvent.setup();
    const reload = () => window.dispatchEvent(new Event("beforeunload", { cancelable: true }));
    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));

    let dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    expect(reload()).toBe(true);

    await user.type(within(dialog).getByLabelText("Nota"), "Reunión de cierre");
    expect(reload()).toBe(false);

    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Registrar movimiento" })).not.toBeInTheDocument();
    expect(reload()).toBe(true);

    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));
    dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    expect(within(dialog).getByLabelText("Nota")).toHaveValue("Reunión de cierre");
  });

  it("supports activity credit and explicit recovery recognition", async () => {
    const user = userEvent.setup();
    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));

    const dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    await user.click(within(dialog).getByRole("radio", { name: "Reconocer recuperación" }));

    const recoveryCategory = data.categories.find(
      (category) => category.activityKind === "RECOVERY",
    )!;
    expect(within(dialog).getByLabelText("Categoría")).toHaveValue(recoveryCategory.id);
    expect(
      within(dialog).getByText(
        /Reconocer recuperación · Crédito · Recuperación de guardia · Recuperación/,
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: "Débito" })).toBeDisabled();
  });

  it("announces mixed selection and keeps the bulk selection explicit", async () => {
    const user = userEvent.setup();
    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));

    const dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    const selectAll = within(dialog).getByRole("checkbox", {
      name: "Seleccionar todos",
    });
    const firstTutor = within(dialog).getByRole("checkbox", {
      name: "Seleccionar a Benítez, Marina",
    });

    expect(selectAll).toBeChecked();
    await user.click(firstTutor);

    expect(selectAll).toHaveAttribute("aria-checked", "mixed");
    expect(within(dialog).getByText("2 de 3")).toBeInTheDocument();
    expect(within(dialog).getByText(/selección mixta/)).toBeInTheDocument();

    await user.click(selectAll);
    expect(selectAll).toBeChecked();
    expect(selectAll).toHaveAttribute("aria-checked", "true");
  });

  it("keeps hidden tutor selections explicit while searching and clearing the selector", async () => {
    const user = userEvent.setup();
    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    await user.type(within(dialog).getByRole("searchbox", { name: "Buscar tutor" }), "Marina");
    expect(within(dialog).queryByRole("checkbox", { name: "Seleccionar a Funes, Lucía" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent("3 de 3 tutores seleccionados; la selección incluye los tutores ocultos por la búsqueda");
    await user.click(within(dialog).getByRole("checkbox", { name: "Seleccionar a Benítez, Marina" }));
    expect(within(dialog).getByRole("checkbox", { name: "Seleccionar todos" })).toHaveAttribute("aria-checked", "mixed");
    await user.clear(within(dialog).getByRole("searchbox", { name: "Buscar tutor" }));
    expect(within(dialog).getByRole("checkbox", { name: "Seleccionar a Funes, Lucía" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Seleccionar a Benítez, Marina" })).not.toBeChecked();
    expect(within(dialog).getByRole("status")).toHaveTextContent("2 de 3 tutores seleccionados");
  });

  it("announces a successful atomic submission and refreshes balances and history", async () => {
    const user = userEvent.setup();
    const recordedMovement = {
      ...data.history[0],
      id: "abababab-abab-4aba-8bab-abababababab",
      movementDate: "2026-08-15",
    };
    const updatedBalances = data.balances.map((balance, index) =>
      index === 0 ? { ...balance, signedBalanceMinutes: 240 } : balance,
    );
    fetchMock
      .mockResolvedValueOnce(
        Response.json(
          {
            cycle: data.currentCycle,
            origin: recordedMovement.origin,
            movements: [recordedMovement],
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          workspaceResponse({ balances: updatedBalances }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ movements: [...data.history, recordedMovement] }, { status: 200 }),
      );

    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));
    await user.click(screen.getByRole("button", { name: "Registrar movimientos" }));

    await waitFor(() =>
      expect(screen.getAllByRole("status").find((element) => element.textContent?.includes("Origen:"))).toHaveTextContent(
        "Se registraron movimientos para 1 tutor. Origen: Reunión.",
      ),
    );
    expect(screen.queryByRole("dialog", { name: "Registrar movimiento" })).not.toBeInTheDocument();
    expect(screen.getAllByText("4 h")).not.toHaveLength(0);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/admin/hours/movements",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      categoryId: data.categories[0].id,
      cycleId: data.currentCycle.id,
      direction: "CREDIT",
      duration: { hours: 1, minutes: 30 },
      movementDate: "2026-08-01",
      note: null,
      operation: "MOVEMENT",
      tutorIds: data.eligibleTutors.map((tutor) => tutor.id),
    });
  });

  it("keeps mutation feedback and balances visible when refresh fails", async () => {
    const user = userEvent.setup();
    const recordedMovement = {
      ...data.history[0],
      id: "abababab-abab-4aba-8bab-abababababac",
      tutor: data.eligibleTutors[0],
      durationMinutes: 90,
      signedDurationMinutes: 90,
    };
    fetchMock
      .mockResolvedValueOnce(
        Response.json(
          {
            cycle: data.currentCycle,
            origin: recordedMovement.origin,
            movements: [recordedMovement],
          },
          { status: 201 },
        ),
      )
      .mockRejectedValueOnce(new Error("refresh unavailable"));

    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));
    await user.click(screen.getByRole("button", { name: "Registrar movimientos" }));

    await waitFor(() =>
      expect(screen.getAllByRole("status").find((element) => element.textContent?.includes("Origen:"))).toHaveTextContent(/Origen: Reun/),
    );
    expect(screen.getAllByRole("status").find((element) => element.textContent?.includes("Origen:"))).toHaveTextContent(/No se pudo actualizar/);
    expect(screen.getAllByText("4 h")).not.toHaveLength(0);
  });

  it("keeps valid transaction input and states that nothing was recorded on failure", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ error: "inactive_category" }, { status: 409 }),
    );

    render(<HoursScreen data={data} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar movimiento" });
    const note = within(dialog).getByLabelText("Nota");
    await user.type(note, "Reintentar con el mismo contexto");
    await user.click(within(dialog).getByRole("button", { name: "Registrar movimientos" }));

    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "No se registró ningún movimiento. La categoría seleccionada ya no está activa.",
      ),
    );
    expect(within(dialog).getByLabelText("Nota")).toHaveValue(
      "Reintentar con el mismo contexto",
    );
    expect(screen.getByRole("dialog", { name: "Registrar movimiento" })).toBeInTheDocument();
  });

  it("loads persisted history and returns focus after closing the overlays", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ movements: data.history }, { status: 200 }),
    );

    render(<HoursScreen data={data} />);

    const movementButton = screen.getByRole("button", { name: "Registrar movimiento" });
    await user.click(movementButton);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Registrar movimiento" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(movementButton));

    const historyButton = screen.getAllByRole("button", {
      name: "Ver movimientos de Benítez, Marina",
    })[0];
    await user.click(historyButton);

    const history = await screen.findByRole("dialog", { name: "Benítez, Marina" });
    await waitFor(() => {
      expect(within(history).getByText("Revertido")).toBeInTheDocument();
      expect(within(history).getByText(/Origen registrado: Reunión/)).toBeInTheDocument();
      expect(within(history).getByText("Saldo", { selector: "p" })).toBeInTheDocument();
      expect(within(history).getByText(/El saldo se calcula a partir de los movimientos confirmados/)).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Benítez, Marina" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(historyButton));
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/admin/hours/movements?cycleId=");
  });

  it("exposes loading, empty, search-empty, error, success, and required states", () => {
    const searchEmpty = hourStates.find((fixture) => fixture.state === "search-empty");
    const error = hourStates.find((fixture) => fixture.state === "error");
    const required = hourStates.find((fixture) => fixture.state === "required-action");

    const { rerender } = render(<HoursScreen data={data} state="loading" />);
    expect(screen.getByRole("status", { name: "Cargando saldos" })).toBeInTheDocument();

    rerender(<HoursScreen data={data} state="empty" />);
    expect(screen.getByRole("heading", { name: "Todavía no hay saldos" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Registrar movimiento" })).toHaveLength(2);

    rerender(<HoursScreen data={data} state="search-empty" />);
    expect(screen.getByRole("heading", { name: searchEmpty!.title })).toBeInTheDocument();

    rerender(
      <HoursScreen
        data={data}
        initialErrorMessage="No se pudieron cargar las horas."
        state="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(error!.title);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las horas.");
    expect(screen.getByRole("link", { name: error!.actionLabel })).toHaveAttribute(
      "href",
      "/admin/hours",
    );

    rerender(<HoursScreen data={data} state="success" />);
    expect(screen.getByText("Movimiento registrado")).toBeInTheDocument();

    rerender(<HoursScreen data={data} state="required-action" />);
    expect(screen.getByRole("heading", { name: required!.title })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: required!.actionLabel })).toHaveLength(2);
  });
});
