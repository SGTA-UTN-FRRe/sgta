import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SafeAdministrativeCycle } from "@/features/cycles/cycle-service";
import type { SafeHourCategory } from "@/features/hours/hour-service";
import type {
  SafeCareer,
  SafeScholarshipReference,
  SafeSubject,
} from "@/features/tutors/tutor-service";

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

const historicalCycle: SafeAdministrativeCycle = {
  ...closedCycle,
  id: "cycle-closed",
};

const activeCareer: SafeCareer = {
  id: "career-1",
  name: "Ingeniería en Sistemas",
  status: "ACTIVE",
};

const inactiveCareer: SafeCareer = {
  id: "career-2",
  name: "Ingeniería Industrial",
  status: "INACTIVE",
};

const activeSubject: SafeSubject = {
  id: "subject-1",
  name: "Álgebra",
  careerId: activeCareer.id,
  careerName: activeCareer.name,
  status: "ACTIVE",
};

const inactiveSubject: SafeSubject = {
  id: "subject-2",
  name: "Cálculo histórico",
  careerId: inactiveCareer.id,
  careerName: inactiveCareer.name,
  status: "INACTIVE",
};

const activeScholarshipReference: SafeScholarshipReference = {
  id: "reference-1",
  type: "Beca institucional",
  knownRequiredHours: 120,
  notes: "Referencia orientativa",
  status: "ACTIVE",
};

const inactiveScholarshipReference: SafeScholarshipReference = {
  id: "reference-2",
  type: "Beca histórica",
  knownRequiredHours: null,
  notes: null,
  status: "INACTIVE",
};

const activeHourCategory: SafeHourCategory = {
  id: "hour-category-1",
  name: "Tutoría individual",
  activityKind: "MEETING",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const inactiveHourCategory: SafeHourCategory = {
  ...activeHourCategory,
  id: "hour-category-2",
  name: "Recuperación histórica",
  activityKind: "RECOVERY",
  status: "INACTIVE",
};

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("SettingsScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders responsive reference sections with historical status and no deletion path", () => {
    render(
      <SettingsScreen
        careers={[activeCareer, inactiveCareer]}
        currentCycle={currentCycle}
        cycles={[currentCycle, historicalCycle]}
        scholarshipReferences={[activeScholarshipReference, inactiveScholarshipReference]}
        subjects={[activeSubject, inactiveSubject]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Carreras" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Materias" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Referencias de beca" })).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(3);
    expect(screen.getByText(/no certifica cumplimiento/i)).toBeInTheDocument();
    expect(screen.getAllByText("Inactiva")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /eliminar|borrar/i })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Activar carrera Ingeniería Industrial" }),
    ).toHaveLength(2);
  });

  it("creates a career through the protected reference API", async () => {
    const user = userEvent.setup();
    const createdCareer: SafeCareer = {
      id: "career-3",
      name: "Ciencias Económicas",
      status: "ACTIVE",
    };
    fetchMock.mockResolvedValue(Response.json({ career: createdCareer }, { status: 201 }));

    render(<SettingsScreen currentCycle={null} cycles={[]} careers={[activeCareer]} />);

    await user.type(screen.getByLabelText("Nombre de la carrera"), createdCareer.name);
    await user.click(screen.getByRole("button", { name: "Agregar carrera" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La carrera se creó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/settings/careers",
      expect.objectContaining({
        body: JSON.stringify({ name: createdCareer.name }),
        method: "POST",
      }),
    );
    expect(screen.getAllByText(createdCareer.name)).not.toHaveLength(0);
  });

  it("preserves career input and explains duplicate conflicts", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ error: "duplicate_career_name" }, { status: 409 }),
    );

    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    const input = screen.getByLabelText("Nombre de la carrera");
    await user.type(input, "Ingeniería en Sistemas");
    await user.click(screen.getByRole("button", { name: "Agregar carrera" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Ya existe una carrera con ese nombre.",
      ),
    );
    expect(input).toHaveValue("Ingeniería en Sistemas");
  });

  it("renders hour categories responsively without a deletion path", () => {
    render(
      <SettingsScreen
        currentCycle={null}
        cycles={[]}
        hourCategories={[activeHourCategory, inactiveHourCategory]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Categorías de horas" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Categorías de horas registradas" })).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(1);
    expect(screen.getAllByText("Inactiva")).not.toHaveLength(0);
    expect(screen.getAllByText("Reunión")).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /eliminar|borrar/i })).not.toBeInTheDocument();
  });

  it("creates and edits an hour category through the protected settings API", async () => {
    const user = userEvent.setup();
    const createdCategory: SafeHourCategory = {
      ...activeHourCategory,
      id: "hour-category-3",
      name: "Taller de apoyo",
      activityKind: "WORKSHOP",
    };
    const updatedCategory: SafeHourCategory = {
      ...createdCategory,
      name: "Taller de apoyo avanzado",
      activityKind: "EXTRAORDINARY",
    };
    fetchMock
      .mockResolvedValueOnce(Response.json({ category: createdCategory }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ category: updatedCategory }, { status: 200 }));

    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    await user.type(screen.getByLabelText("Nombre de categoría"), createdCategory.name);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Origen de actividad (opcional)" }),
      createdCategory.activityKind ?? "",
    );
    await user.click(screen.getByRole("button", { name: "Agregar categoría" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La categoría de horas se creó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/admin/settings/hour-categories",
      expect.objectContaining({
        body: JSON.stringify({
          activityKind: createdCategory.activityKind,
          name: createdCategory.name,
        }),
        method: "POST",
      }),
    );

    await user.click(
      screen.getAllByRole("button", {
        name: `Editar categoría ${createdCategory.name}`,
      })[0],
    );
    const nameInput = screen.getByLabelText("Nombre de categoría");
    await user.clear(nameInput);
    await user.type(nameInput, updatedCategory.name);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Origen de actividad (opcional)" }),
      updatedCategory.activityKind ?? "",
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La categoría de horas se actualizó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/admin/settings/hour-categories/${createdCategory.id}`,
      expect.objectContaining({
        body: JSON.stringify({
          activityKind: updatedCategory.activityKind,
          name: updatedCategory.name,
        }),
        method: "PATCH",
      }),
    );
  });

  it("shows the empty category state and preserves input focus on duplicate conflicts", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json({ error: "duplicate_category_name" }, { status: 409 }),
    );

    render(<SettingsScreen currentCycle={null} cycles={[]} hourCategories={[]} />);

    expect(screen.getByText("Todavía no hay categorías de horas registradas.")).toBeInTheDocument();
    const input = screen.getByLabelText("Nombre de categoría");
    await user.type(input, "Tutoría individual");
    await user.click(screen.getByRole("button", { name: "Agregar categoría" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Ya existe una categoría de horas con ese nombre.",
      ),
    );
    expect(input).toHaveValue("Tutoría individual");
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("maps an unsupported activity kind to actionable validation feedback", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      Response.json(
        {
          error: "invalid_request",
          issues: [
            {
              code: "invalid_value",
              message: "Invalid option",
              path: ["activityKind"],
            },
          ],
        },
        { status: 400 },
      ),
    );

    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    await user.type(screen.getByLabelText("Nombre de categoría"), "Categoría inválida");
    await user.click(screen.getByRole("button", { name: "Agregar categoría" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Seleccionar un origen de actividad válido para la categoría.",
      ),
    );
  });

  it("changes category status while keeping the historical row visible", async () => {
    const user = userEvent.setup();
    const inactivatedCategory = { ...activeHourCategory, status: "INACTIVE" as const };
    fetchMock.mockResolvedValue(
      Response.json({ category: inactivatedCategory }, { status: 200 }),
    );

    render(
      <SettingsScreen
        currentCycle={null}
        cycles={[]}
        hourCategories={[activeHourCategory]}
      />,
    );

    await user.click(
      screen.getAllByRole("button", {
        name: `Inactivar categoría ${activeHourCategory.name}`,
      })[0],
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La categoría de horas se inactivó y se conservaron sus movimientos.",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/settings/hour-categories/${activeHourCategory.id}/status`,
      expect.objectContaining({
        body: JSON.stringify({ status: "INACTIVE" }),
        method: "PATCH",
      }),
    );
    expect(screen.getAllByText(activeHourCategory.name)).not.toHaveLength(0);
    expect(screen.getAllByText("Inactiva")).not.toHaveLength(0);
  });

  it("keeps inactive careers out of new subject selection and creates a subject in an active career", async () => {
    const user = userEvent.setup();
    const createdSubject: SafeSubject = {
      ...activeSubject,
      id: "subject-3",
      name: "Geometría",
    };
    fetchMock.mockResolvedValue(Response.json({ subject: createdSubject }, { status: 201 }));

    render(
      <SettingsScreen
        careers={[activeCareer, inactiveCareer]}
        currentCycle={null}
        cycles={[]}
        subjects={[inactiveSubject]}
      />,
    );

    const careerSelect = screen.getByRole("combobox", { name: "Carrera" });
    expect(careerSelect).not.toHaveTextContent(inactiveCareer.name);
    await user.type(screen.getByLabelText("Nombre de la materia"), createdSubject.name);
    await user.selectOptions(careerSelect, activeCareer.id);
    await user.click(screen.getByRole("button", { name: "Agregar materia" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La materia se creó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/settings/subjects",
      expect.objectContaining({
        body: JSON.stringify({ careerId: activeCareer.id, name: createdSubject.name }),
        method: "POST",
      }),
    );
  });

  it("creates and edits informational scholarship references", async () => {
    const user = userEvent.setup();
    const createdReference: SafeScholarshipReference = {
      id: "reference-3",
      type: "Beca de ayuda",
      knownRequiredHours: 96,
      notes: "Solo como referencia",
      status: "ACTIVE",
    };
    const updatedReference: SafeScholarshipReference = {
      ...createdReference,
      type: "Beca de ayuda actualizada",
    };
    fetchMock
      .mockResolvedValueOnce(
        Response.json(
          { scholarshipReference: createdReference },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json(
          { scholarshipReference: updatedReference },
          { status: 200 },
        ),
      );

    render(<SettingsScreen currentCycle={null} cycles={[]} />);

    await user.type(screen.getByLabelText("Tipo de referencia"), createdReference.type);
    await user.type(
      screen.getByRole("spinbutton", { name: "Horas requeridas conocidas (informativo)" }),
      String(createdReference.knownRequiredHours),
    );
    await user.type(screen.getByLabelText("Notas"), createdReference.notes ?? "");
    await user.click(screen.getByRole("button", { name: "Agregar referencia" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La referencia de beca se creó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/admin/settings/scholarship-references",
      expect.objectContaining({
        body: JSON.stringify({
          knownRequiredHours: createdReference.knownRequiredHours,
          notes: createdReference.notes,
          type: createdReference.type,
        }),
        method: "POST",
      }),
    );

    await user.click(
      screen.getAllByRole("button", { name: `Editar referencia ${createdReference.type}` })[0],
    );
    const typeInput = screen.getByLabelText("Tipo de referencia");
    await user.clear(typeInput);
    await user.type(typeInput, updatedReference.type);
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La referencia de beca se actualizó correctamente.",
      ),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `/api/admin/settings/scholarship-references/${createdReference.id}`,
      expect.objectContaining({
        body: JSON.stringify({
          knownRequiredHours: createdReference.knownRequiredHours,
          notes: createdReference.notes,
          type: updatedReference.type,
        }),
        method: "PATCH",
      }),
    );
  });

  it("updates reference status without deleting historical data", async () => {
    const user = userEvent.setup();
    const inactiveCareerResult = { ...activeCareer, status: "INACTIVE" as const };
    fetchMock.mockResolvedValue(
      Response.json({ career: inactiveCareerResult }, { status: 200 }),
    );

    render(<SettingsScreen currentCycle={currentCycle} cycles={[currentCycle]} careers={[activeCareer]} />);

    await user.click(
      screen.getAllByRole("button", { name: "Inactivar carrera Ingeniería en Sistemas" })[0],
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "La carrera se inactivó y se conservaron sus relaciones.",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/admin/settings/careers/${activeCareer.id}/status`,
      expect.objectContaining({
        body: JSON.stringify({ status: "INACTIVE" }),
        method: "PATCH",
      }),
    );
    expect(screen.getAllByText("Ingeniería en Sistemas")).not.toHaveLength(0);
  });

  it("exposes initial loading and error states", () => {
    const { rerender } = render(
      <SettingsScreen currentCycle={null} cycles={[]} initialState="loading" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardando cambios de configuración",
    );

    rerender(
      <SettingsScreen
        currentCycle={null}
        cycles={[]}
        initialErrorMessage="No se pudo cargar la configuración."
        initialState="error"
        key="error"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo cargar la configuración.",
    );
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
