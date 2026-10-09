import { render, screen, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  SafeScheduleAssignment,
  SafeSchedulePlan,
  SafeScheduleWorkspace,
} from "./schedule-service";
import { SchedulesScreen } from "./schedules-screen";

const mocks = vi.hoisted(() => ({ toastSuccess: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));

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
    careerColor: "BLUE" as const,
    careerName: "Tecnicatura Universitaria en Programación",
    displayName: "Marina",
    formalName: "Benítez, Marina",
    id: "44444444-4444-4444-8444-444444444444",
    status: "ACTIVE" as const,
  },
  {
    careerColor: "VIOLET" as const,
    careerName: "Ingeniería en Sistemas de Información",
    displayName: "Tomás",
    formalName: "Acosta, Tomás",
    id: "55555555-5555-4555-8555-555555555555",
    status: "ACTIVE" as const,
  },
];

const mondayAssignment: SafeScheduleAssignment = {
  assignmentDate: null,
  careerColor: tutors[0].careerColor,
  careerName: tutors[0].careerName,
  createdAt: "2026-08-02T12:00:00.000Z",
  endMinutes: 600,
  id: "66666666-6666-4666-8666-666666666666",
  kind: "DUTY",
  modality: "IN_PERSON",
  pattern: "WEEKDAY",
  planId: regularPlan.id,
  startMinutes: 480,
  status: "ACTIVE",
  tutorId: tutors[0].id,
  tutorName: tutors[0].formalName,
  tutorDisplayName: tutors[0].displayName,
  updatedAt: "2026-08-02T12:00:00.000Z",
  weekday: 1,
};

const tuesdayAssignment: SafeScheduleAssignment = {
  assignmentDate: null,
  careerColor: tutors[1].careerColor,
  careerName: tutors[1].careerName,
  createdAt: "2026-08-02T12:00:00.000Z",
  endMinutes: 720,
  id: "77777777-7777-4777-8777-777777777777",
  kind: "DUTY",
  modality: "VIRTUAL",
  pattern: "WEEKDAY",
  planId: regularPlan.id,
  startMinutes: 600,
  status: "ACTIVE",
  tutorId: tutors[1].id,
  tutorName: tutors[1].formalName,
  tutorDisplayName: tutors[1].displayName,
  updatedAt: "2026-08-02T12:00:00.000Z",
  weekday: 2,
};

const mondayLabel =
  "Benítez, Marina, Tecnicatura Universitaria en Programación, lunes, 08:00 a 10:00";
const tuesdayLabel =
  "Acosta, Tomás, Ingeniería en Sistemas de Información, martes, 10:00 a 12:00, Virtual";

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

function weeklyGrid() {
  return within(screen.getByRole("group", { name: "Grilla semanal" }));
}

function weeklyMatrix() {
  return within(screen.getByRole("table", { name: "Matriz semanal" }));
}

async function showBlocks(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "Bloques" }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  mocks.toastSuccess.mockReset();
});

describe("SchedulesScreen", () => {
  it("renders the plan bar, the weekly matrix, and discreet coverage", () => {
    render(<SchedulesScreen state="default" workspace={workspace} />);

    expect(screen.getByRole("heading", { level: 1, name: "Horarios" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: regularPlan.name })).toBeInTheDocument();
    expect(screen.getByText(cycle.name)).toBeInTheDocument();
    expect(screen.getByText("Fecha de referencia")).toBeInTheDocument();
    expect(screen.getByText("14/09/2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar asignación" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nuevo plan" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "Planes de horario" })).getByRole("button", { name: /Regular/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("radio", { name: "Matriz" })).toHaveAttribute("aria-checked", "true");

    const matrix = weeklyMatrix();
    expect(matrix.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Horario", "LUN", "MAR", "MIÉ", "JUE", "VIE",
    ]);
    expect(matrix.getAllByRole("rowheader").map((header) => header.textContent)).toEqual([
      "08:0009:00", "09:0010:00", "10:0011:00", "11:0012:00",
    ]);

    // The chip repeats in every hour the assignment covers; only the first hour is a tab stop.
    const mondayChips = matrix.getAllByRole("button", { name: mondayLabel });
    expect(mondayChips).toHaveLength(2);
    expect(mondayChips[0]).toHaveAttribute("tabindex", "0");
    expect(mondayChips[1]).toHaveAttribute("tabindex", "-1");
    expect(mondayChips[0]).toHaveTextContent("TUPMarina");
    expect(mondayChips[0]).toHaveClass("bg-career-blue", "border-input");
    expect(matrix.getAllByRole("button", { name: tuesdayLabel })[0]).toHaveClass("bg-career-violet");

    // Monday has one in-person Tutor; Tuesday only a virtual one. Other hours are closed.
    const cells = Array.from(document.querySelectorAll("table[aria-label='Matriz semanal'] td"));
    expect(cells.map((cell) => cell.getAttribute("data-coverage"))).toEqual([
      "minimal", "closed", "closed", "closed", "closed",
      "minimal", "closed", "closed", "closed", "closed",
      "closed", "uncovered", "closed", "closed", "closed",
      "closed", "uncovered", "closed", "closed", "closed",
    ]);
    expect(screen.getByText("2 franjas sin presencial")).toBeInTheDocument();
    expect(screen.getByText("2 con un solo presencial")).toBeInTheDocument();
    expect(screen.getAllByText("Un solo tutor presencial", { selector: ".sr-only" })).not.toHaveLength(0);

    const days = screen.getByRole("radiogroup", { name: "Días del plan" });
    expect(within(days).getByRole("radio", { name: "Lun" })).toHaveAttribute("aria-checked", "true");
  });

  it("collapses long empty stretches and shows weekend columns only when used", () => {
    const morning = { ...mondayAssignment, endMinutes: 600, startMinutes: 480 };
    const afternoon = { ...tuesdayAssignment, endMinutes: 1020, modality: "IN_PERSON" as const, startMinutes: 900 };
    const saturday = {
      ...mondayAssignment,
      endMinutes: 660,
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      startMinutes: 600,
      weekday: 6,
    };

    render(
      <SchedulesScreen state="default" workspace={createWorkspace({ assignments: [morning, afternoon, saturday] })} />,
    );

    const matrix = weeklyMatrix();
    expect(matrix.getAllByRole("columnheader").at(-1)).toHaveTextContent("SÁB");
    expect(matrix.getByText("11:00–15:00 · Sin guardias asignadas")).toBeInTheDocument();
  });

  it("shows the Tutor's preferred name and tells repeated names apart", () => {
    const daniel: SafeScheduleAssignment = {
      ...mondayAssignment,
      tutorDisplayName: "Daniel",
      tutorName: "Acevedo, Mario Daniel",
    };
    const emaChemistry: SafeScheduleAssignment = {
      ...tuesdayAssignment,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      modality: "IN_PERSON",
      tutorDisplayName: "Ema",
      tutorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      tutorName: "Gómez, Emanuel",
    };
    const emaElectromechanics: SafeScheduleAssignment = {
      ...emaChemistry,
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      tutorId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      tutorName: "Paz, Emanuela",
    };

    render(
      <SchedulesScreen
        state="default"
        workspace={createWorkspace({ assignments: [daniel, emaChemistry, emaElectromechanics] })}
      />,
    );

    const matrix = weeklyMatrix();
    const danielChip = matrix.getAllByRole("button", { name: /^Acevedo, Mario Daniel \(Daniel\), / })[0]!;
    expect(danielChip).toHaveTextContent("TUPDaniel");
    expect(matrix.getAllByRole("button", { name: /^Gómez, Emanuel \(Ema\)/ })[0]).toHaveTextContent("Ema G.");
    expect(matrix.getAllByRole("button", { name: /^Paz, Emanuela \(Ema\)/ })[0]).toHaveTextContent("Ema P.");
  });

  it("keeps short blocks on one line with their times fully available", async () => {
    const user = userEvent.setup();
    const assignments: SafeScheduleAssignment[] = [
      { ...mondayAssignment, endMinutes: 510, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", tutorDisplayName: "Alex", tutorName: "Rivera, Alex" },
      { ...mondayAssignment, endMinutes: 600, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", startMinutes: 540, tutorDisplayName: "Jamie", tutorName: "Morgan, Jamie", weekday: 2 },
      { ...mondayAssignment, endMinutes: 720, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", startMinutes: 600, tutorDisplayName: "Casey", tutorName: "Taylor, Casey", weekday: 3 },
    ];

    render(<SchedulesScreen state="default" workspace={createWorkspace({ assignments })} />);
    await showBlocks(user);

    const career = mondayAssignment.careerName;
    const expectedAssignments = [
      { durationLayout: "compact", label: `Rivera, Alex, ${career}, lunes, 08:00 a 08:30`, time: "08:00–08:30" },
      { durationLayout: "compact", label: `Morgan, Jamie, ${career}, martes, 09:00 a 10:00`, time: "09:00–10:00" },
      { durationLayout: "full", label: `Taylor, Casey, ${career}, miércoles, 10:00 a 12:00`, time: "10:00–12:00" },
    ];

    for (const expected of expectedAssignments) {
      const assignment = weeklyGrid().getByRole("button", { name: expected.label });

      expect(assignment).toHaveAttribute("data-duration-layout", expected.durationLayout);
      expect(assignment).toHaveAttribute("title", expected.label);
      expect(assignment).toHaveTextContent("TUP");
      expect(assignment.querySelector("[data-schedule-assignment-time]")).toHaveTextContent(expected.time);
    }

    await user.click(weeklyGrid().getByRole("button", { name: expectedAssignments[0].label }));
    const editor = screen.getByRole("dialog", { name: "Editar asignación" });
    expect(within(editor).getByLabelText("Modalidad")).toHaveValue("IN_PERSON");
  });

  it("marks recovery, virtual, and conflict without relying on color", async () => {
    const user = userEvent.setup();
    const recoveryAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      endMinutes: 510,
      id: "99999999-9999-4999-8999-999999999999",
      kind: "RECOVERY",
      modality: "VIRTUAL",
      tutorDisplayName: "Alex",
      tutorName: "Rivera, Alex",
    };

    render(
      <SchedulesScreen
        state="conflict"
        workspace={createWorkspace({
          assignments: [recoveryAssignment],
          conflicts: [{ assignmentId: recoveryAssignment.id, conflictingAssignmentIds: [] }],
        })}
      />,
    );
    await showBlocks(user);

    const accessibleName = `Rivera, Alex, ${mondayAssignment.careerName}, lunes, 08:00 a 08:30, Virtual, Recuperación, conflicto de horario`;
    const assignment = weeklyGrid().getByRole("button", { name: accessibleName });

    expect(assignment).toHaveAttribute("data-duration-layout", "compact");
    expect(assignment).toHaveAttribute("aria-pressed", "false");
    expect(assignment).toHaveClass("bg-hatch", "bg-career-blue", "border-destructive");
    for (const cue of ["Virtual", "Recuperación", "Conflicto"]) {
      expect(within(assignment).getByText(cue, { selector: ".sr-only" })).toBeInTheDocument();
    }

    await user.click(assignment);

    expect(assignment).toHaveAttribute("aria-pressed", "true");
    expect(assignment).toHaveClass("outline-primary");
  });

  it("filters both views by career while coverage keeps counting every assignment", async () => {
    const user = userEvent.setup();
    render(<SchedulesScreen state="default" workspace={workspace} />);

    const legend = within(screen.getByRole("region", { name: "Carreras" }));
    const systems = legend.getByRole("button", { name: tuesdayAssignment.careerName });
    expect(legend.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      tuesdayAssignment.careerName,
      mondayAssignment.careerName,
    ]);
    expect(systems).toHaveTextContent("ISI");
    expect(legend.queryByRole("button", { name: "Mostrar todas" })).not.toBeInTheDocument();

    await user.click(systems);

    expect(systems).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 1 de 2 asignaciones");
    expect(weeklyMatrix().queryByRole("button", { name: mondayLabel })).not.toBeInTheDocument();
    expect(weeklyMatrix().getAllByRole("button", { name: tuesdayLabel })).toHaveLength(2);
    expect(screen.getByText("2 con un solo presencial")).toBeInTheDocument();

    await showBlocks(user);
    expect(weeklyGrid().queryByRole("button", { name: mondayLabel })).not.toBeInTheDocument();
    expect(
      screen.getByText("Agregar una asignación para completar este día del plan."),
    ).toBeInTheDocument();

    await user.click(legend.getByRole("button", { name: "Mostrar todas" }));

    expect(systems).toHaveAttribute("aria-pressed", "false");
    expect(weeklyGrid().getByRole("button", { name: mondayLabel })).toBeInTheDocument();
  });

  it("takes the career from the assignment for Tutors outside the eligible list", () => {
    const inactiveTutorAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      careerColor: "EMERALD",
      careerName: "Ingeniería Química",
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      tutorDisplayName: "Ana",
      tutorId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      tutorName: "López, Ana",
    };

    render(
      <SchedulesScreen state="default" workspace={createWorkspace({ assignments: [inactiveTutorAssignment] })} />,
    );

    const chip = weeklyMatrix().getAllByRole("button", {
      name: "López, Ana, Ingeniería Química, lunes, 08:00 a 10:00",
    })[0]!;
    expect(chip).toHaveTextContent("IQAna");
    expect(chip).toHaveClass("bg-career-emerald");
  });

  it("switches plans through the workspace API and resets the career filter", async () => {
    const user = userEvent.setup();
    const activeSpecialPlan: SafeSchedulePlan = { ...specialPlan, status: "ACTIVE" };
    const multiPlanWorkspace = createWorkspace({ plans: [regularPlan, activeSpecialPlan] });
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
    await user.click(screen.getByRole("button", { name: tuesdayAssignment.careerName }));
    const planSelector = within(screen.getByRole("group", { name: "Planes de horario" }));
    await user.click(planSelector.getByRole("button", { name: /Mesas de examen/ }));

    await waitFor(() => {
      expect(planSelector.getByRole("button", { name: /Mesas de examen/ })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("status")).toHaveTextContent("Este horario todavía no tiene asignaciones.");
    expect(screen.queryByRole("region", { name: "Carreras" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates a virtual assignment through the API and confirms it with a toast", async () => {
    const user = userEvent.setup();
    const createdAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      id: "88888888-8888-4888-8888-888888888888",
      modality: "VIRTUAL",
    };
    const updatedWorkspace = createWorkspace({ assignments: [...workspace.assignments, createdAssignment] });
    const fetchMock = installFetch(async (input, init) => {
      if (init?.method === "POST") {
        expect(String(input)).toBe("/api/admin/schedules/assignments");
        expect(JSON.parse(String(init.body))).toMatchObject({
          modality: "VIRTUAL",
          planId: regularPlan.id,
          tutorId: tutors[0].id,
          weekday: 1,
        });
        return jsonResponse({ assignment: createdAssignment }, 201);
      }

      return jsonResponse(updatedWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);
    const addButton = screen.getByRole("button", { name: "Agregar asignación" });
    await user.click(addButton);

    const editor = screen.getByRole("dialog", { name: "Nueva asignación" });
    expect(within(editor).getByText(/Regular · Segundo cuatrimestre · Regular/)).toBeInTheDocument();
    expect(within(editor).queryByRole("button", { name: "Eliminar asignación" })).not.toBeInTheDocument();
    const modality = within(editor).getByLabelText("Modalidad");
    expect(modality).toHaveValue("IN_PERSON");
    expect(within(modality).getAllByRole("option").map((option) => option.textContent)).toEqual(["Presencial", "Virtual"]);
    await user.selectOptions(modality, "VIRTUAL");
    expect(within(editor).getByText(/· Virtual$/)).toBeInTheDocument();
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Nueva asignación" })).not.toBeInTheDocument();
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cambios guardados", {
      description: "La asignación se guardó correctamente.",
    });
    expect(addButton).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps assignment input and shows the server error inside the sheet", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch(async (_input, init) => {
      expect(init?.method).toBe("POST");
      return jsonResponse({ error: "assignment_conflict" }, 409);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);
    await user.click(screen.getByRole("button", { name: "Agregar asignación" }));
    const editor = screen.getByRole("dialog", { name: "Nueva asignación" });
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

  it("validates the assignment schedule before saving", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch(async () => jsonResponse({}));

    render(<SchedulesScreen state="default" workspace={workspace} />);
    await user.click(screen.getByRole("button", { name: "Agregar asignación" }));
    const editor = screen.getByRole("dialog", { name: "Nueva asignación" });
    await user.selectOptions(within(editor).getByLabelText("Repetición"), "DATE");
    expect(within(editor).queryByLabelText("Día")).not.toBeInTheDocument();
    expect(within(editor).getByLabelText("Fecha")).toHaveValue(regularPlan.validFrom);
    const endInput = within(editor).getByLabelText("Fin");
    await user.clear(endInput);
    await user.type(endInput, "07:00");
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    expect(within(editor).getByRole("alert")).toHaveTextContent(
      "El fin debe ser posterior al inicio y pertenecer al día.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates an existing assignment and returns focus to its chip", async () => {
    const user = userEvent.setup();
    const updatedAssignment = { ...mondayAssignment, endMinutes: 660 };
    const updatedWorkspace = createWorkspace({ assignments: [updatedAssignment, tuesdayAssignment] });
    const fetchMock = installFetch(async (input, init) => {
      if (init?.method === "PATCH") {
        expect(String(input)).toBe(`/api/admin/schedules/assignments/${mondayAssignment.id}`);
        expect(JSON.parse(String(init.body))).toMatchObject({ endMinutes: 660, modality: "IN_PERSON" });
        return jsonResponse({ assignment: updatedAssignment });
      }

      return jsonResponse(updatedWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);
    const chips = weeklyMatrix().getAllByRole("button", { name: mondayLabel });
    await user.click(chips[0]!);
    for (const chip of chips) {
      expect(chip).toHaveAttribute("aria-pressed", "true");
    }
    const editor = screen.getByRole("dialog", { name: "Editar asignación" });
    const endInput = within(editor).getByLabelText("Fin");
    await user.clear(endInput);
    await user.type(endInput, "11:00");
    await user.click(within(editor).getByRole("button", { name: "Guardar asignación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Editar asignación" })).not.toBeInTheDocument();
    });
    expect(document.activeElement).toHaveAttribute("data-schedule-assignment-id", mondayAssignment.id);
    expect(document.activeElement).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deletes an assignment and archives the plan through their protected endpoints", async () => {
    const user = userEvent.setup();
    const inactivePlan = { ...regularPlan, status: "INACTIVE" as const };
    const inactiveAssignment = { ...mondayAssignment, status: "INACTIVE" as const };
    const assignmentLifecycleWorkspace = createWorkspace({ assignments: [inactiveAssignment, tuesdayAssignment] });
    const planLifecycleWorkspace = createWorkspace({
      assignments: [inactiveAssignment, tuesdayAssignment],
      plans: [inactivePlan, specialPlan],
      selectedPlan: null,
    });
    let refreshCount = 0;
    const fetchMock = installFetch(async (input, init) => {
      const path = String(input);

      if (init?.method === "PATCH" && path.includes("/plans/")) {
        expect(path).toBe(`/api/admin/schedules/plans/${regularPlan.id}/status`);
        expect(JSON.parse(String(init.body))).toEqual({ status: "INACTIVE" });
        return jsonResponse({ plan: inactivePlan });
      }

      if (init?.method === "PATCH") {
        expect(path).toBe(`/api/admin/schedules/assignments/${mondayAssignment.id}/status`);
        return jsonResponse({ assignment: inactiveAssignment });
      }

      refreshCount += 1;
      return jsonResponse(refreshCount === 1 ? assignmentLifecycleWorkspace : planLifecycleWorkspace);
    });

    render(<SchedulesScreen state="default" workspace={workspace} />);

    await user.click(weeklyMatrix().getAllByRole("button", { name: mondayLabel })[0]!);
    await user.click(screen.getByRole("button", { name: "Eliminar asignación" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Editar asignación" })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: mondayLabel })).not.toBeInTheDocument();
    expect(mocks.toastSuccess).toHaveBeenLastCalledWith("Cambios guardados", {
      description: "La asignación se eliminó correctamente.",
    });

    await user.click(screen.getByRole("button", { name: "Archivar plan" }));
    const confirmDialog = screen.getByRole("alertdialog", { name: "¿Archivar este plan?" });
    expect(confirmDialog).toHaveTextContent(`El plan ${regularPlan.name} se moverá al archivo de planes`);
    expect(within(confirmDialog).getByRole("button", { name: "Cancelar" })).toHaveFocus();
    await user.click(within(confirmDialog).getByRole("button", { name: "Archivar plan" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("No hay un plan de horario activo");
    });
    expect(mocks.toastSuccess).toHaveBeenLastCalledWith("Cambios guardados", {
      description: "El plan fue archivado correctamente.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("creates a plan through the API from the no-plan state", async () => {
    const user = userEvent.setup();
    const emptyWorkspace = createWorkspace({ assignments: [], plans: [], selectedPlan: null });
    const createdPlan: SafeSchedulePlan = {
      ...specialPlan,
      id: "99999999-9999-4999-8999-999999999999",
      name: "Especial · Recuperatorios",
      status: "ACTIVE",
    };
    const savedWorkspace = createWorkspace({
      assignments: [],
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
    // Paste the name in one input event; typing it key by key re-renders the workspace per character.
    await user.click(within(editor).getByLabelText("Nombre"));
    await user.paste(createdPlan.name);
    await Promise.all([
      waitForElementToBeRemoved(editor),
      user.click(within(editor).getByRole("button", { name: "Guardar plan" })),
    ]);

    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cambios guardados", {
      description: "El plan se guardó correctamente.",
    });
    expect(screen.getByRole("heading", { level: 2, name: createdPlan.name })).toBeInTheDocument();
    // Radix restores focus in a deferred task; the header's primary action keeps its position.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Agregar asignación" })).toHaveFocus();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("names conflicting assignments and opens the first one for review", async () => {
    const user = userEvent.setup();
    const conflictWorkspace = createWorkspace({
      conflicts: [
        { assignmentId: mondayAssignment.id, conflictingAssignmentIds: [tuesdayAssignment.id] },
      ],
    });

    render(<SchedulesScreen state="conflict" workspace={conflictWorkspace} />);
    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("Hay asignaciones superpuestas");
    expect(notice).toHaveTextContent(
      "Benítez, Marina, lunes, 08:00 a 10:00 se superpone con Acosta, Tomás, martes, 10:00 a 12:00.",
    );
    expect(
      weeklyMatrix().getAllByRole("button", { name: `${mondayLabel}, conflicto de horario` })[0],
    ).toHaveClass("border-destructive");

    await user.click(screen.getByRole("button", { name: "Revisar conflicto" }));
    expect(screen.getByRole("dialog", { name: "Editar asignación" })).toBeInTheDocument();
  });

  it("exposes loading, empty, no-plan, error, and required-action states", () => {
    const { rerender } = render(<SchedulesScreen state="loading" workspace={workspace} />);
    expect(screen.getByRole("status", { name: "Cargando horarios" })).toHaveTextContent(
      "Estamos preparando el plan y sus asignaciones.",
    );

    rerender(<SchedulesScreen key="empty-plan" state="empty-plan" workspace={createWorkspace({ assignments: [] })} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Este horario todavía no tiene asignaciones.",
    );

    rerender(
      <SchedulesScreen
        key="no-plan"
        state="no-plan"
        workspace={createWorkspace({ assignments: [], plans: [specialPlan], selectedPlan: null })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "No hay planes activos en este ciclo. Crear un plan nuevo o reactivar uno desde Archivo de planes.",
    );
    expect(screen.getAllByRole("button", { name: "Archivo de planes" })).toHaveLength(2);

    rerender(<SchedulesScreen key="error" state="error" workspace={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el horario");
    expect(screen.getByRole("link", { name: "Reintentar" })).toHaveAttribute("href", "/admin/schedules");

    rerender(<SchedulesScreen key="required-action" state="required-action" workspace={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Abrir un ciclo para gestionar horarios");
    for (const link of screen.getAllByRole("link", { name: "Configurar ciclo" })) {
      expect(link).toHaveAttribute("href", "/admin/settings");
    }
  });

  it("only lists active plans in the plan selector", () => {
    render(<SchedulesScreen state="default" workspace={workspace} />);

    const planSelector = within(screen.getByRole("group", { name: "Planes de horario" }));
    expect(planSelector.getByRole("button", { name: /Regular/ })).toBeInTheDocument();
    expect(planSelector.queryByRole("button", { name: /Mesas de examen/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivar plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archivo de planes" })).toBeInTheDocument();
  });

  it("lists archived plans in the archive sheet and reactivates one", async () => {
    const user = userEvent.setup();
    const reactivatedPlan: SafeSchedulePlan = { ...specialPlan, status: "ACTIVE" };
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

    const sheet = within(screen.getByRole("dialog", { name: "Archivo de planes" }));
    const plans = within(sheet.getByRole("list", { name: "Listado de planes archivados" }));
    const archivedPlan = plans.getByRole("button", { name: /Mesas de examen/ });
    expect(archivedPlan).toHaveAttribute("aria-pressed", "true");
    expect(archivedPlan).toHaveTextContent("Archivado");
    expect(archivedPlan).toHaveTextContent("Especial · 21/09/2026 — 02/10/2026");

    await user.click(plans.getByRole("button", { name: "Reactivar plan" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Archivo de planes" })).not.toBeInTheDocument();
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Cambios guardados", {
      description: "El plan fue reactivado correctamente.",
    });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("shows archived plan assignments read-only in the archive sheet", async () => {
    const user = userEvent.setup();
    const archivedAssignment: SafeScheduleAssignment = {
      ...mondayAssignment,
      id: "archive-assignment-1",
      planId: specialPlan.id,
      tutorDisplayName: "Mario",
      tutorName: "Acevedo, Mario",
    };

    render(
      <SchedulesScreen
        state="default"
        workspace={createWorkspace({
          assignments: [mondayAssignment, tuesdayAssignment, archivedAssignment],
        })}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Archivo de planes" }));

    const sheet = within(screen.getByRole("dialog", { name: "Archivo de planes" }));
    expect(sheet.getByText("Solo lectura")).toBeInTheDocument();
    expect(sheet.getByText("Modo solo lectura para el plan archivado.")).toBeInTheDocument();
    const grid = within(sheet.getByRole("group", { name: `Asignaciones de ${specialPlan.name}` }));
    expect(
      grid.getByText(`Acevedo, Mario, ${mondayAssignment.careerName}, lunes, 08:00 a 10:00`),
    ).toBeInTheDocument();
    expect(grid.queryByRole("button")).not.toBeInTheDocument();
  });
});
