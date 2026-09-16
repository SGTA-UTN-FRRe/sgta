import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  goldenScreenFixtures,
  goldenScreenStateFixtures,
} from "@/features/golden-screens/fixtures";

import { HoursScreen } from "./hours-screen";

const fixture = goldenScreenFixtures.hours;
const hourStates = goldenScreenStateFixtures.hours;

describe("HoursScreen", () => {
  it("renders the balance hierarchy with signed values and text statuses", () => {
    render(<HoursScreen fixture={fixture} />);

    expect(screen.getByRole("heading", { level: 1, name: "Horas" })).toBeInTheDocument();
    expect(screen.getByText(fixture.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Registrar movimiento" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveAttribute(
      "placeholder",
      fixture.searchPlaceholder,
    );
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getAllByText("+02:30")).not.toHaveLength(0);
    expect(screen.getAllByText("Al día")).not.toHaveLength(0);
    expect(screen.getAllByText("Debe horas")).not.toHaveLength(0);
  });

  it("filters balances locally by search, status, and category", async () => {
    const user = userEvent.setup();
    render(<HoursScreen fixture={fixture} />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar" }), "Lucía");

    expect(screen.queryByText("Benítez, Marina")).not.toBeInTheDocument();
    expect(screen.getAllByText("Funes, Lucía")).not.toHaveLength(0);

    await user.clear(screen.getByRole("searchbox", { name: "Buscar" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "owes");

    expect(screen.queryByText("Benítez, Marina")).not.toBeInTheDocument();
    expect(screen.getAllByText("Acosta, Tomás")).not.toHaveLength(0);

    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "all");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Categoría" }),
      "Actividad extraordinaria",
    );

    expect(screen.queryByText("Acosta, Tomás")).not.toBeInTheDocument();
    expect(screen.getAllByText("Funes, Lucía")).not.toHaveLength(0);
  });

  it("opens the movement dialog with explicit fields and a dynamic summary", async () => {
    const user = userEvent.setup();
    render(<HoursScreen fixture={fixture} />);

    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));

    const dialog = screen.getByRole("dialog", { name: fixture.movementDialog.title });
    expect(within(dialog).getByText("Dirección")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Categoría")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Horas")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Minutos")).toHaveValue(30);
    expect(within(dialog).getByLabelText("Fecha")).toHaveValue("2026-09-16");
    expect(within(dialog).getByLabelText("Nota")).toBeInTheDocument();
    expect(within(dialog).getByText(fixture.movementDialog.summary)).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText("Categoría"), "Guardia");
    await user.click(within(dialog).getByRole("radio", { name: "Débito" }));

    expect(within(dialog).getByText(/Débito — Guardia — 01:30 — 3 tutores — 16\/09\/2026/)).toBeInTheDocument();
  });

  it("announces mixed selection and keeps the bulk selection explicit", async () => {
    const user = userEvent.setup();
    render(<HoursScreen fixture={fixture} />);
    await user.click(screen.getByRole("button", { name: "Registrar movimiento" }));

    const dialog = screen.getByRole("dialog", { name: fixture.movementDialog.title });
    const selectAll = within(dialog).getByRole("checkbox", {
      name: fixture.movementDialog.selectAllLabel,
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

  it("returns focus after closing the movement dialog and the history sheet", async () => {
    const user = userEvent.setup();
    render(<HoursScreen fixture={fixture} />);

    const movementButton = screen.getByRole("button", { name: "Registrar movimiento" });
    await user.click(movementButton);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: fixture.movementDialog.title })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(movementButton));

    const historyButton = screen.getAllByRole("button", {
      name: "Ver movimientos de Benítez, Marina",
    })[0];
    await user.click(historyButton);

    const history = screen.getByRole("dialog", { name: "Benítez, Marina" });
    expect(within(history).getByText("Movimientos")).toBeInTheDocument();
    expect(within(history).getByText("Revertido")).toBeInTheDocument();
    expect(
      within(history).getByText("El movimiento original se conserva sin editar y se muestra como revertido."),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Benítez, Marina" })).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(historyButton));
  });

  it("exposes loading, empty, search-empty, error, success, and required states", () => {
    const searchEmpty = hourStates.find((state) => state.state === "search-empty");
    const error = hourStates.find((state) => state.state === "error");
    const required = hourStates.find((state) => state.state === "required-action");

    const { rerender } = render(<HoursScreen fixture={fixture} state="loading" />);
    expect(screen.getByRole("status", { name: "Cargando saldos" })).toBeInTheDocument();

    rerender(<HoursScreen fixture={fixture} state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent("Todavía no hay saldos");
    expect(screen.getAllByRole("button", { name: "Registrar movimiento" })).toHaveLength(2);

    rerender(<HoursScreen fixture={fixture} state="search-empty" />);
    expect(screen.getByRole("status")).toHaveTextContent(searchEmpty!.title);

    rerender(<HoursScreen fixture={fixture} state="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent(error!.title);
    expect(screen.getByRole("link", { name: error!.actionLabel })).toHaveAttribute(
      "href",
      "/admin/horas",
    );

    rerender(<HoursScreen fixture={fixture} state="success" />);
    expect(screen.getByRole("status")).toHaveTextContent("Vista previa lista");
    expect(screen.getByText(/No se registraron movimientos/)).toBeInTheDocument();

    rerender(<HoursScreen fixture={fixture} state="required-action" />);
    expect(screen.getByRole("status")).toHaveTextContent(required!.title);
    expect(screen.getAllByRole("link", { name: required!.actionLabel })).toHaveLength(2);
  });
});
