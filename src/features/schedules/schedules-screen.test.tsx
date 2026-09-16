import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  schedulesScreenData,
  schedulesStateFixtures,
} from "@/mocks/schedules.mock";

import { SchedulesScreen } from "./schedules-screen";

const data = schedulesScreenData;
const scheduleStates = schedulesStateFixtures;

describe("SchedulesScreen", () => {
  it("renders plan context, responsive workspaces, and accessible assignment blocks", () => {
    render(<SchedulesScreen data={data} />);

    expect(screen.getByRole("heading", { level: 1, name: "Horarios" })).toBeInTheDocument();
    expect(screen.getByText(data.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: data.primaryAction })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: data.secondaryAction })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Regular/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText(data.plans[0].validity)).not.toHaveLength(0);
    expect(screen.getAllByRole("grid")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Benítez, Marina, LUN, 08:00 a 10:00/ })).not.toHaveLength(0);
  });

  it("keeps the selected plan while switching to the empty special plan", async () => {
    const user = userEvent.setup();
    render(<SchedulesScreen data={data} />);

    await user.click(screen.getByRole("tab", { name: /Especial/ }));

    expect(screen.getByRole("tab", { name: /Especial/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("status")).toHaveTextContent(data.emptyPlanLabel);
    expect(screen.getAllByText(data.plans[1].validity)).not.toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: data.primaryAction })[0]);
    const editor = screen.getByRole("dialog", { name: "Agregar asignación" });
    expect(within(editor).getByText(data.plans[1].name)).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("tab", { name: /Especial/ })).toHaveAttribute("aria-selected", "true"));
  });

  it("opens the assignment editor, validates time, and updates only the local preview", async () => {
    const user = userEvent.setup();
    render(<SchedulesScreen data={data} />);

    const addButton = screen.getByRole("button", { name: data.primaryAction });
    await user.click(addButton);

    const editor = screen.getByRole("dialog", { name: "Agregar asignación" });
    expect(within(editor).getByLabelText("Tutor")).toBeInTheDocument();
    expect(within(editor).getByLabelText("Día")).toBeInTheDocument();
    expect(within(editor).getByLabelText("Fecha")).toBeInTheDocument();
    expect(within(editor).getByLabelText("Inicio")).toHaveValue("08:00");
    expect(within(editor).getByLabelText("Fin")).toHaveValue("10:00");
    expect(within(editor).getByLabelText("Modalidad")).toBeInTheDocument();
    expect(within(editor).getByText(/Benítez, Marina · LUN · 08:00 — 10:00/)).toBeInTheDocument();

    await user.clear(within(editor).getByLabelText("Fin"));
    await user.type(within(editor).getByLabelText("Fin"), "07:00");
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    expect(within(editor).getByRole("alert")).toHaveTextContent("El fin debe ser posterior al inicio.");

    await user.clear(within(editor).getByLabelText("Fin"));
    await user.type(within(editor).getByLabelText("Fin"), "09:00");
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Agregar asignación" })).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("Asignación preparada");
    expect(screen.getByRole("tab", { name: /Regular/ })).toHaveAttribute("aria-selected", "true");
    expect(document.activeElement).toBe(addButton);
  });

  it("supports compact day selection and returns focus after editing an assignment", async () => {
    const user = userEvent.setup();
    render(<SchedulesScreen data={data} />);

    await user.click(screen.getByRole("tab", { name: "MAR" }));
    expect(screen.getAllByRole("button", { name: /Acosta, Tomás, MAR, 10:00 a 12:00/ })).not.toHaveLength(0);

    const assignmentButton = screen.getAllByRole("button", {
      name: "Acosta, Tomás, MAR, 10:00 a 12:00",
    })[0];
    await user.click(assignmentButton);

    const editor = screen.getByRole("dialog", { name: "Editar asignación" });
    expect(within(editor).getByText("Editar asignación")).toBeInTheDocument();
    expect(within(editor).getByLabelText("Tutor")).toHaveValue("Acosta, Tomás");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(assignmentButton));
  });

  it("makes conflicts explicit and provides a form recovery path", async () => {
    const user = userEvent.setup();
    render(<SchedulesScreen data={data} state="conflict" />);

    const conflictState = scheduleStates.find((state) => state.state === "conflict");
    expect(screen.getByRole("alert")).toHaveTextContent(conflictState!.title);
    expect(screen.getAllByText("Conflicto")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: conflictState!.actionLabel }));
    expect(screen.getByRole("dialog", { name: "Editar asignación" })).toBeInTheDocument();
  });

  it("exposes loading, empty plan, no plan, error, success, required, and conflict states", () => {
    const empty = scheduleStates.find((state) => state.state === "empty");
    const error = scheduleStates.find((state) => state.state === "error");
    const required = scheduleStates.find((state) => state.state === "required-action");

    const { rerender } = render(<SchedulesScreen data={data} state="loading" />);
    expect(screen.getByRole("status", { name: "Cargando horarios" })).toBeInTheDocument();

    rerender(<SchedulesScreen data={data} state="empty-plan" />);
    expect(screen.getByRole("status")).toHaveTextContent(empty!.title);
    expect(screen.getAllByRole("button", { name: data.primaryAction })).not.toHaveLength(0);

    rerender(<SchedulesScreen data={data} state="no-plan" />);
    expect(screen.getByRole("status")).toHaveTextContent(required!.title);
    expect(screen.getAllByRole("button", { name: "Crear plan" })).toHaveLength(2);

    rerender(<SchedulesScreen data={data} state="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent(error!.title);
    expect(screen.getByRole("link", { name: error!.actionLabel })).toHaveAttribute(
      "href",
      "/admin/schedules",
    );

    rerender(<SchedulesScreen data={data} state="success" />);
    expect(screen.getByRole("status")).toHaveTextContent("Vista previa actualizada");

    rerender(<SchedulesScreen data={data} state="required-action" />);
    expect(screen.getByRole("status")).toHaveTextContent(required!.title);
    expect(screen.getByRole("link", { name: "Configurar ciclo" })).toHaveAttribute(
      "href",
      "/admin/settings",
    );

    rerender(<SchedulesScreen data={data} state="conflict" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Hay asignaciones superpuestas");
  });
});
