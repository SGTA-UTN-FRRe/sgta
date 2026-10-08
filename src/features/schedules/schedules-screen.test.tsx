import { render, screen, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  SafeScheduleAssignment,
  SafeSchedulePlan,
  SafeScheduleWorkspace,
} from "./schedule-service";
import { SchedulesScreen } from "./schedules-screen";

const cycle = {
  endDate: "2026-11-27",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Segundo cuatrimestre 2026",
  startDate: "2026-08-03",
  status: "OPEN" as const,
};

const regularPlan: SafeSchedulePlan = {
  createdAt: "2026-08-01T12:00:00.000Z",
  cycleId: cycle.id,
  id: "22222222-2222-4222-8222-222222222222",
  kind: "REGULAR",
  name: "Regular · Segundo cuatrimestre",
  status: "ACTIVE",
  updatedAt: "2026-08-01T12:00:00.000Z",
  validFrom: "2026-08-03",
  validTo: "2026-11-27",
};

const specialPlan: SafeSchedulePlan = {
  createdAt: "2026-08-01T12:00:00.000Z",
  cycleId: cycle.id,
  id: "33333333-3333-4333-8333-333333333333",
  kind: "SPECIAL",
  name: "Especial · Mesas de examen",
  status: "INACTIVE",
  updatedAt: "2026-08-01T12:00:00.000Z",
  validFrom: "2026-09-21",
  validTo: "2026-10-02",
};

const tutors = [
  {
    careerName: "Tecnicatura Universitaria en Programación",
    formalName: "Benítez, Marina",
    id: "44444444-4444-4444-8444-444444444444",
    status: "ACTIVE" as const,
  },
  {
    careerName: "Ingeniería en Sistemas de Información",
    formalName: "Acosta, Tomás",
    id: "55555555-5555-4555-8555-555555555555",
    status: "ACTIVE" as const,
  },
];

const mondayAssignment: SafeScheduleAssignment = {
  assignmentDate: null,
  createdAt: "2026-08-02T12:00:00.000Z",
  endMinutes: 600,
  id: "66666666-6666-4666-8666-666666666666",
  kind: "DUTY",
  modality: "Presencial · Aula 204",
  pattern: "WEEKDAY",
  planId: regularPlan.id,
  startMinutes: 480,
  status: "ACTIVE",
  tutorId: tutors[0].id,
  tutorName: tutors[0].formalName,
  updatedAt: "2026-08-02T12:00:00.000Z",
  weekday: 1,
};

const tuesdayAssignment: SafeScheduleAssignment = {
  assignmentDate: null,
  createdAt: "2026-08-02T12:00:00.000Z",
  endMinutes: 720,
  id: "77777777-7777-4777-8777-777777777777",
  kind: "DUTY",
  modality: "Remota",
  pattern: "WEEKDAY",
  planId: regularPlan.id,
  startMinutes: 600,
  status: "ACTIVE",
  tutorId: tutors[1].id,
  tutorName: tutors[1].formalName,
  updatedAt: "2026-08-02T12:00:00.000Z",
  weekday: 2,
};

function createWorkspace(
  overrides: Partial<SafeScheduleWorkspace> = {},
): SafeScheduleWorkspace {
  return {
    currentCycle: cycle,
    effective: {
      date: "2026-09-14",
    },
    eligibleTutors: tutors,
    conflicts: [],
    plans: [regularPlan, specialPlan],
    requestedDate: "2026-09-14",
    selectedPlan: regularPlan,
    assignments: [mondayAssignment, tuesdayAssignment],
    ...overrides,
  };
}

const workspace = createWorkspace();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

function installFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>,
) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SchedulesScreen", () => {
  it("renders live plan context, responsive workspaces, and accessible assignments", () => {
    render(<SchedulesScreen state="default" workspace={workspace} />);

    expect(screen.getByRole("heading", { level: 1, name: "Horarios" })).toBeInTheDocument();
    expect(screen.getByText(cycle.name)).toBeInTheDocument();
    expect(screen.getByText("Fecha de referencia")).toBeInTheDocument();
    expect(screen.getAllByText("Seleccionar una guardia para editarla.")).toHaveLength(2);
    expect(screen.getAllByText(regularPlan.name)).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Nuevo plan" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Planes de horario" })).getByRole("button", {
        name: /Regular/,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("group", { name: /^Grilla/ })).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: /Benítez, Marina, LUN, 08:00 a 10:00/ }),
    ).not.toHaveLength(0);
  });

  it("keeps short assignment labels compact and full assignment details available", async () => {
    const user = userEvent.setup();
    const assignments: SafeScheduleAssignment[] = [
      {
        ...mondayAssignment,
        endMinutes: 510,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        tutorName: "Rivera, Alex",
      },
      {
        ...mondayAssignment,
        endMinutes: 600,
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        startMinutes: 540,
        tutorName: "Morgan, Jamie",
        weekday: 2,
      },
      {
        ...mondayAssignment,
        endMinutes: 720,
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        startMinutes: 600,
        tutorName: "Taylor, Casey",
        weekday: 3,
      },
    ];

    render(
      <SchedulesScreen
        state="default"
        workspace={createWorkspace({ assignments })}
      />,
    );

    const weeklyGrid = within(
      screen.getByRole("group", { name: "Grilla semanal" }),
    );
    const expectedAssignments = [
      {
        durationLayout: "compact",
        label: "Rivera, Alex, LUN, 08:00 a 08:30",
        start: "08:00",
        end: "08:30",
      },
      {
        durationLayout: "compact",
        label: "Morgan, Jamie, MAR, 09:00 a 10:00",
        start: "09:00",
        end: "10:00",
      },
      {
        durationLayout: "full",
        label: "Taylor, Casey, MIÉ, 10:00 a 12:00",
        start: "10:00",
        end: "12:00",
      },
    ];

    for (const expected of expectedAssignments) {
      const assignment = weeklyGrid.getByRole("button", {
        name: expected.label,
      });

      expect(assignment).toHaveAttribute(
        "data-duration-layout",
        expected.durationLayout,
      );
      expect(assignment).toHaveAccessibleName(expected.label);
      expect(assignment).toHaveAttribute("title", expected.label);
      expect(assignment).toHaveTextContent(expected.start);
      expect(assignment).toHaveTextContent(expected.end);
      expect(
        assignment.querySelector("[data-schedule-assignment-time]"),
      ).toHaveTextContent(expected.start);
      expect(
        assignment.querySelector("[data-schedule-assignment-time]"),
      ).toHaveTextContent(expected.end);
    }

    await user.click(
      weeklyGrid.getByRole("button", {
        name: "Rivera, Alex, LUN, 08:00 a 08:30",
      }),
    );
    const editor = screen.getByRole("dialog", { name: "Editar asignación" });
    expect(within(editor).getByLabelText("Modalidad")).toHaveValue(
      mondayAssignment.modality,
    );
  });

  it("exposes compact recovery and conflict states without badges", async () => {
    const user = userEvent.setup();
    const recoveryAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      endMinutes: 510,
      id: "99999999-9999-4999-8999-999999999999",
      kind: "RECOVERY",
      tutorName: "Rivera, Alex",
    };

    render(
      <SchedulesScreen
        state="default"
        workspace={
          createWorkspace({
            assignments: [recoveryAssignment],
            conflicts: [
              {
                assignmentId: recoveryAssignment.id,
                conflictingAssignmentIds: [],
              },
            ],
          })
        }
      />,
    );

    const weeklyGrid = within(screen.getByRole("group", { name: "Grilla semanal" }));
    const accessibleName = "Rivera, Alex, LUN, 08:00 a 08:30, conflicto de horario";
    const assignment = weeklyGrid.getByRole("button", { name: accessibleName });

    expect(assignment).toHaveAttribute("data-duration-layout", "compact");
    expect(assignment).toHaveAttribute("aria-pressed", "false");
    expect(assignment).toHaveAccessibleName(accessibleName);
    expect(assignment).toHaveAttribute("aria-describedby");
    expect(
      within(assignment).getByText("Conflicto. Recuperación.", {
        selector: ".sr-only",
      }),
    ).toBeInTheDocument();
    expect(assignment.querySelectorAll('[aria-hidden="true"] svg')).toHaveLength(2);
    const statusIds = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[id^="schedule-assignment-status-"]',
      ),
    ).map((element) => element.id);
    expect(new Set(statusIds).size).toBe(statusIds.length);
    expect(assignment).not.toHaveTextContent("Seleccionada");

    await user.click(assignment);

    expect(assignment).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches plans through the workspace API and keeps the selected plan live", async () => {
    const user = userEvent.setup();
    const activeSpecialPlan: SafeSchedulePlan = {
      ...specialPlan,
      status: "ACTIVE",
    };
    const multiPlanWorkspace = createWorkspace({
      plans: [regularPlan, activeSpecialPlan],
    });
    const specialWorkspace = createWorkspace({
      assignments: [],
      effective: { date: "2026-09-21" },
      plans: [regularPlan, activeSpecialPlan],
      requestedDate: "2026-09-21",
      selectedPlan: activeSpecialPlan,
    });
    const fetchMock = installFetch(async (input) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("cycleId")).toBe(cycle.id);
      expect(url.searchParams.get("planId")).toBe(activeSpecialPlan.id);
      return jsonResponse(specialWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={multiPlanWorkspace} />);
    const planSelector = screen.getByRole("group", { name: "Planes de horario" });
    const specialPlanButton = within(planSelector).getAllByRole("button")[1];
    if (specialPlanButton === undefined) {
      throw new Error("The workspace should render the special plan button.");
    }
    await user.click(specialPlanButton);

    await waitFor(() => {
      const activePlanSelector = screen.getByRole("group", { name: "Planes de horario" });
      const activeSpecialPlanButton = within(activePlanSelector).getAllByRole("button")[1];
      expect(activeSpecialPlanButton).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Este horario todavía no tiene asignaciones.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates an assignment through the API and refreshes the live workspace", async () => {
    const user = userEvent.setup();
    const createdAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      id: "88888888-8888-4888-8888-888888888888",
      tutorId: tutors[1].id,
      tutorName: tutors[1].formalName,
    };
    const updatedWorkspace = createWorkspace({
      assignments: [...workspace.assignments, createdAssignment],
    });
    const fetchMock = installFetch(async (input, init) => {
      if (init?.method === "POST") {
        expect(String(input)).toBe("/api/admin/schedules/assignments");
        expect(JSON.parse(String(init.body))).toMatchObject({
          planId: regularPlan.id,
          tutorId: tutors[0].id,
        });
        return jsonResponse({ assignment: createdAssignment }, 201);
      }

      return jsonResponse(updatedWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);
    await user.click(screen.getAllByRole("button", { name: "Agregar asignación" })[0]);

    const editor = screen.getByRole("dialog", { name: "Agregar asignación" });
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Agregar asignación" })).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole("status").some((element) =>
      element.textContent?.includes("Cambios guardados"),
    )).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps assignment input and exposes an actionable conflict after a failed save", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch(async (_input, init) => {
      expect(init?.method).toBe("POST");
      return jsonResponse({ error: "assignment_conflict" }, 409);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);
    await user.click(screen.getAllByRole("button", { name: "Agregar asignación" })[0]);
    const editor = screen.getByRole("dialog", { name: "Agregar asignación" });
    const endInput = within(editor).getByLabelText("Fin");
    await user.clear(endInput);
    await user.type(endInput, "11:00");
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    expect(await within(editor).findByRole("alert")).toHaveTextContent(
      "La asignación se superpone con otra guardia del mismo tutor.",
    );
    expect(endInput).toHaveValue("11:00");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("updates an existing assignment and returns focus after the live refresh", async () => {
    const user = userEvent.setup();
    const updatedAssignment = { ...mondayAssignment, endMinutes: 660 };
    const updatedWorkspace = createWorkspace({ assignments: [updatedAssignment, tuesdayAssignment] });
    const fetchMock = installFetch(async (input, init) => {
      if (init?.method === "PATCH") {
        expect(String(input)).toBe(`/api/admin/schedules/assignments/${mondayAssignment.id}`);
        expect(JSON.parse(String(init.body))).toMatchObject({ endMinutes: 660 });
        return jsonResponse({ assignment: updatedAssignment });
      }

      return jsonResponse(updatedWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);
    const assignmentButton = screen.getAllByRole("button", {
      name: /Benítez, Marina, LUN, 08:00 a 10:00/,
    })[0];
    await user.click(assignmentButton);
    const editor = screen.getByRole("dialog", { name: "Editar asignación" });
    const endInput = within(editor).getByLabelText("Fin");
    await user.clear(endInput);
    await user.type(endInput, "11:00");
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Editar asignación" })).not.toBeInTheDocument();
    });
    expect(document.activeElement).toHaveAttribute(
      "data-schedule-assignment-id",
      mondayAssignment.id,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("persists plan and assignment lifecycle changes through their protected endpoints", async () => {
    const user = userEvent.setup();
    const inactivePlan = { ...regularPlan, status: "INACTIVE" as const };
    const inactiveAssignment = { ...mondayAssignment, status: "INACTIVE" as const };
    const assignmentLifecycleWorkspace = createWorkspace({
      assignments: [inactiveAssignment, tuesdayAssignment],
      plans: [regularPlan, specialPlan],
      selectedPlan: regularPlan,
    });
    const planLifecycleWorkspace = createWorkspace({
      assignments: [inactiveAssignment, tuesdayAssignment],
      plans: [inactivePlan, specialPlan],
      selectedPlan: inactivePlan,
    });
    let refreshCount = 0;
    const fetchMock = installFetch(async (input, init) => {
      const path = String(input);

      if (init?.method === "PATCH" && path.includes("/plans/")) {
        expect(path).toBe(`/api/admin/schedules/plans/${regularPlan.id}/status`);
        return jsonResponse({ plan: inactivePlan });
      }

      if (init?.method === "PATCH") {
        expect(path).toBe(
          `/api/admin/schedules/assignments/${mondayAssignment.id}/status`,
        );
        return jsonResponse({ assignment: inactiveAssignment });
      }

      refreshCount += 1;
      return jsonResponse(
        refreshCount === 1 ? assignmentLifecycleWorkspace : planLifecycleWorkspace,
      );
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);

    const assignmentButton = screen.getAllByRole("button", {
      name: /Benítez, Marina, LUN, 08:00 a 10:00/,
    })[0];
    await user.click(assignmentButton);
    await user.click(screen.getByRole("button", { name: "Eliminar asignación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Editar asignación" })).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", {
        name: /Benítez, Marina, LUN, 08:00 a 10:00/,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archivar plan" }));
    const confirmDialog = screen.getByRole("alertdialog", { name: /¿Archivar este plan\?/ });
    await user.click(within(confirmDialog).getByRole("button", { name: "Archivar plan" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("creates a plan through the API and keeps the plan form server-backed", async () => {
    const user = userEvent.setup();
    const emptyWorkspace = createWorkspace({
      assignments: [],
      effective: { date: "2026-09-14" },
      plans: [],
      selectedPlan: null,
    });
    const createdPlan: SafeSchedulePlan = {
      ...specialPlan,
      id: "99999999-9999-4999-8999-999999999999",
      name: "Especial · Recuperatorios",
      status: "ACTIVE",
    };
    const savedWorkspace = createWorkspace({
      assignments: [],
      effective: { date: "2026-09-14" },
      plans: [createdPlan],
      selectedPlan: createdPlan,
    });
    const fetchMock = installFetch(async (input, init) => {
      if (init?.method === "POST") {
        expect(String(input)).toBe("/api/admin/schedules/plans");
        expect(JSON.parse(String(init.body))).toMatchObject({
          cycleId: cycle.id,
          kind: "SPECIAL",
          name: createdPlan.name,
        });
        return jsonResponse({ plan: createdPlan }, 201);
      }

      return jsonResponse(savedWorkspace);
    });

    render(<SchedulesScreen state="no-plan" workspace={emptyWorkspace} />);
    await user.click(screen.getAllByRole("button", { name: "Crear plan" })[0]);
    const editor = screen.getByRole("dialog", { name: "Crear plan de horario" });
    // Wait for the dialog's scheduled initial focus before pasting into the input.
    await waitFor(() => {
      expect(within(editor).getByRole("button", { name: "Cerrar nuevo plan" })).toHaveFocus();
    });
    // Paste the long name in one input event; typing it key by key re-renders the whole
    // workspace per character and exceeded the test timeout on slow CI runners.
    await user.click(within(editor).getByLabelText("Nombre"));
    await user.paste(createdPlan.name);
    expect(within(editor).getByLabelText("Nombre")).toHaveValue(createdPlan.name);
    await Promise.all([
      waitForElementToBeRemoved(editor),
      user.click(within(editor).getByRole("button", { name: "Guardar plan" })),
    ]);
    expect(screen.getAllByRole("status").some((element) =>
      element.textContent?.includes("Cambios guardados"),
    )).toBe(true);
    expect(screen.getAllByText(createdPlan.name)).not.toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("marks live conflicts and opens the conflicting assignment for recovery", async () => {
    const user = userEvent.setup();
    const conflictWorkspace = createWorkspace({
      conflicts: [
        {
          assignmentId: mondayAssignment.id,
          conflictingAssignmentIds: [tuesdayAssignment.id],
        },
      ],
    });

    render(<SchedulesScreen state="conflict" workspace={conflictWorkspace} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Hay asignaciones superpuestas");
    expect(screen.getAllByText("Conflicto")).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Revisar conflicto" }));
    expect(screen.getByRole("dialog", { name: "Editar asignación" })).toBeInTheDocument();
  });

  it("exposes loading, empty, no-plan, error, success, and required-action states", () => {
    const { rerender } = render(
      <SchedulesScreen state="loading" workspace={workspace} />,
    );
    expect(screen.getByRole("status", { name: "Cargando horarios" })).toBeInTheDocument();

    rerender(
      <SchedulesScreen
        state="empty-plan"
        workspace={createWorkspace({ assignments: [] })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Este horario todavía no tiene asignaciones.",
    );

    rerender(
      <SchedulesScreen
        state="no-plan"
        workspace={createWorkspace({
          assignments: [],
          effective: { date: "2026-09-14" },
          plans: [],
          selectedPlan: null,
        })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("No hay un plan de horario activo");

    rerender(
      <SchedulesScreen
        initialErrorMessage="No se pudo cargar el horario."
        state="error"
        workspace={null}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el horario.");

    rerender(<SchedulesScreen state="success" workspace={workspace} />);
    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");

    rerender(<SchedulesScreen state="required-action" workspace={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Abrir un ciclo para gestionar horarios",
    );
    expect(screen.getAllByRole("link", { name: "Configurar ciclo" })[0]).toHaveAttribute(
      "href",
      "/admin/settings",
    );
  });

  it("only lists active plans on the main operational view and excludes archived plans", () => {
    render(<SchedulesScreen state="default" workspace={workspace} />);

    const planSelector = screen.getByRole("group", { name: "Planes de horario" });
    expect(within(planSelector).getByRole("button", { name: /Regular/ })).toBeInTheDocument();
    expect(within(planSelector).queryByRole("button", { name: /Especial/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivar plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivo de planes" })).toBeInTheDocument();
  });

  it("opens the plans archive dialog, lists inactive plans with metadata, and reactivates a plan", async () => {
    const user = userEvent.setup();
    const reactivatedPlan: SafeSchedulePlan = {
      ...specialPlan,
      status: "ACTIVE",
    };
    const reactivatedWorkspace = createWorkspace({
      plans: [regularPlan, reactivatedPlan],
      selectedPlan: reactivatedPlan,
    });
    const fetchMock = installFetch(async (input, init) => {
      const path = String(input);
      if (init?.method === "PATCH" && path === `/api/admin/schedules/plans/${specialPlan.id}/status`) {
        expect(JSON.parse(String(init.body))).toEqual({ status: "ACTIVE" });
        return jsonResponse({ plan: reactivatedPlan });
      }
      return jsonResponse(reactivatedWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);

    await user.click(screen.getByRole("button", { name: "Archivo de planes" }));

    const dialog = screen.getByRole("dialog", { name: "Archivo de planes" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getAllByText(specialPlan.name).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(cycle.name)).toBeInTheDocument();
    expect(within(dialog).getByText("Archivado")).toBeInTheDocument();
    expect(within(dialog).getByText("Especial")).toBeInTheDocument();

    const reactivateButton = within(dialog).getAllByRole("button", { name: "Reactivar plan" })[0];
    await user.click(reactivateButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Archivo de planes" })).not.toBeInTheDocument();
    });
    expect(screen.getByText(/El plan fue reactivado correctamente/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("renders read-only preview of archived plan assignments in the archive modal", async () => {
    const user = userEvent.setup();
    const archivedAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      id: "archive-assignment-1",
      planId: specialPlan.id,
      tutorName: "Acevedo, Mario",
    };
    const workspaceWithArchived = createWorkspace({
      assignments: [mondayAssignment, tuesdayAssignment, archivedAssignment],
    });

    render(<SchedulesScreen state="default" workspace={workspaceWithArchived} />);

    await user.click(screen.getByRole("button", { name: "Archivo de planes" }));

    const dialog = screen.getByRole("dialog", { name: "Archivo de planes" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Solo lectura")).toBeInTheDocument();
    expect(within(dialog).getByText("Modo solo lectura para el plan archivado.")).toBeInTheDocument();

    const assignmentBlock = within(dialog).getByRole("button", {
      name: /Acevedo, Mario, LUN, 08:00 a 10:00/,
    });
    expect(assignmentBlock).toBeDisabled();
  });
});
