import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  SafeAttendanceDateResult,
  SafeAttendanceOccurrence,
  SafeAttendanceRecord,
  SafeAttendanceTutor,
} from "./attendance-service";
import type { SafeHourCategory } from "@/features/hours/hour-service";
import { AttendanceScreen } from "./attendance-screen";

const cycle = {
  endDate: "2026-11-27",
  id: "11111111-1111-4111-8111-111111111111",
  name: "Segundo cuatrimestre 2026",
  startDate: "2026-08-03",
  status: "OPEN" as const,
};

const plan = {
  createdAt: "2026-08-01T12:00:00.000Z",
  cycleId: cycle.id,
  id: "22222222-2222-4222-8222-222222222222",
  kind: "REGULAR" as const,
  name: "Regular · Segundo cuatrimestre",
  status: "ACTIVE" as const,
  updatedAt: "2026-08-01T12:00:00.000Z",
  validFrom: cycle.startDate,
  validTo: cycle.endDate,
};

const tutor: SafeAttendanceTutor = {
  careerName: "Tecnicatura Universitaria en Programación",
  formalName: "Benítez, Marina",
  id: "33333333-3333-4333-8333-333333333333",
  status: "ACTIVE",
};

const debitCategory: SafeHourCategory = {
  activityKind: null,
  createdAt: "2026-08-01T12:00:00.000Z",
  id: "44444444-4444-4444-8444-444444444444",
  name: "Guardia",
  status: "ACTIVE",
  updatedAt: "2026-08-01T12:00:00.000Z",
};

const recoveryCategory: SafeHourCategory = {
  ...debitCategory,
  activityKind: "RECOVERY",
  id: "55555555-5555-4555-8555-555555555555",
  name: "Recuperación de guardia",
};

function createEntry(
  id: string,
  attendanceOverrides: Partial<SafeAttendanceRecord> = {},
  occurrenceOverrides: Partial<SafeAttendanceOccurrence["occurrence"]> = {},
): SafeAttendanceOccurrence {
  const occurrence = {
    assignmentId: "66666666-6666-4666-8666-666666666666",
    createdAt: "2026-08-02T12:00:00.000Z",
    cycleId: cycle.id,
    endMinutes: 600,
    id,
    kind: "DUTY" as const,
    modality: "Presencial · Aula 204",
    occurrenceDate: "2026-09-14",
    planId: plan.id,
    recovery: {
      markedForRecovery: false,
      recognition: "NOT_APPLICABLE" as const,
    },
    startMinutes: 480,
    tutorId: tutor.id,
    ...occurrenceOverrides,
  };
  const attendance: SafeAttendanceRecord = {
    debitStatus: "NOT_PROPOSED",
    id: `attendance-${id}`,
    occurrenceId: id,
    proposedDebitMinutes: null,
    recognizedDebitMinutes: null,
    status: "PENDING",
    updatedAt: "2026-09-14T12:00:00.000Z",
    ...attendanceOverrides,
  };

  return { attendance, occurrence, tutor };
}

function createData(
  occurrences: SafeAttendanceOccurrence[],
  date = "2026-09-14",
): SafeAttendanceDateResult {
  return { cycle, date, occurrences, plan };
}

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

const categoriesResponse = { categories: [debitCategory, recoveryCategory] };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AttendanceScreen", () => {
  it("renders the cycle, plan, date, occurrence context, and row actions", () => {
    const entry = createEntry("77777777-7777-4777-8777-777777777777");

    render(<AttendanceScreen data={createData([entry])} />);

    expect(screen.getByRole("heading", { level: 1, name: "Asistencia" })).toBeInTheDocument();
    expect(screen.getByText(cycle.name)).toBeInTheDocument();
    expect(screen.getByText(plan.name)).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-09-14");
    expect(screen.getByText(tutor.formalName)).toBeInTheDocument();
    expect(screen.getByText(/08:00 a 10:00/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Presente para ${tutor.formalName}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Falta para ${tutor.formalName}` }),
    ).toBeInTheDocument();
  });

  it("loads a new effective date while preserving the cycle context", async () => {
    const entry = createEntry("88888888-8888-4888-8888-888888888888");
    const fetchMock = installFetch(async (input) => {
      const url = new URL(String(input), "http://localhost");
      expect(url.searchParams.get("cycleId")).toBe(cycle.id);
      expect(url.searchParams.get("date")).toBe("2026-09-15");
      return jsonResponse(createData([], "2026-09-15"));
    });

    render(<AttendanceScreen data={createData([entry])} />);
    fireEvent.change(screen.getByLabelText("Fecha"), { target: { value: "2026-09-15" } });

    await waitFor(() => {
      expect(screen.getByText("No hay guardias para esta fecha")).toBeInTheDocument();
    });
    expect(screen.getByText(cycle.name)).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-09-15");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks an occurrence present without changing the hour balance", async () => {
    const user = userEvent.setup();
    const entry = createEntry("99999999-9999-4999-8999-999999999999");
    const presentEntry = createEntry(
      entry.occurrence.id,
      { status: "PRESENT" },
    );
    const fetchMock = installFetch(async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({ operation: "PRESENT" });
      return jsonResponse({ attendance: presentEntry, movement: null, reversal: null });
    });

    render(<AttendanceScreen data={createData([entry])} />);
    await user.click(
      screen.getByRole("button", { name: `Presente para ${tutor.formalName}` }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");
    });
    expect(screen.getByText("Presente no modifica el balance de horas.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Corregir asistencia de ${tutor.formalName}` })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps an absence without debit when the proposed debit is cancelled", async () => {
    const user = userEvent.setup();
    const entry = createEntry("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const absentEntry = createEntry(
      entry.occurrence.id,
      { debitStatus: "PROPOSED", proposedDebitMinutes: 120, status: "ABSENT" },
    );
    const cancelledEntry = createEntry(
      entry.occurrence.id,
      { debitStatus: "CANCELLED", proposedDebitMinutes: 120, status: "ABSENT" },
    );
    const fetchMock = installFetch(async (_input, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        if (body.operation === "ABSENT") {
          return jsonResponse({ attendance: absentEntry, movement: null, reversal: null });
        }
        expect(body).toEqual({ operation: "CANCEL_DEBIT" });
        return jsonResponse({ attendance: cancelledEntry, movement: null, reversal: null });
      }

      return jsonResponse(categoriesResponse);
    });

    render(<AttendanceScreen data={createData([entry])} />);
    await user.click(screen.getByRole("button", { name: `Falta para ${tutor.formalName}` }));

    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar débito por inasistencia",
    });
    expect(within(dialog).getByText(/Duración propuesta: 2 h 00 min/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await user.click(
      screen.getByRole("button", {
        name: `Cancelar débito por inasistencia para ${tutor.formalName}`,
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText(/Falta registrada sin débito/)).toBeInTheDocument();
    });
    expect(screen.getByText("Sin débito")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("confirms an adjusted absence debit through the explicit category dialog", async () => {
    const user = userEvent.setup();
    const entry = createEntry(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      { debitStatus: "PROPOSED", proposedDebitMinutes: 120, status: "ABSENT" },
    );
    const confirmedEntry = createEntry(
      entry.occurrence.id,
      { debitStatus: "CONFIRMED", proposedDebitMinutes: 90, recognizedDebitMinutes: 90, status: "ABSENT" },
    );
    const fetchMock = installFetch(async (_input, init) => {
      if (init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          categoryId: debitCategory.id,
          debitMinutes: 90,
          note: null,
          operation: "CONFIRM_DEBIT",
        });
        return jsonResponse({ attendance: confirmedEntry, movement: {}, reversal: null });
      }

      return jsonResponse(categoriesResponse);
    });

    render(<AttendanceScreen data={createData([entry])} />);
    const trigger = screen.getByRole("button", {
      name: `Confirmar débito por inasistencia para ${tutor.formalName}`,
    });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Confirmar débito por inasistencia",
    });
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Categoría de horas")).toHaveValue(debitCategory.id);
    });
    const minutes = within(dialog).getByLabelText("Minutos a debitar");
    await user.clear(minutes);
    await user.type(minutes, "90");
    await user.click(within(dialog).getByRole("button", { name: "Confirmar débito" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText(/Movimiento de débito vinculado por 1 h 30 min/)).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("saves an auditable attendance correction", async () => {
    const user = userEvent.setup();
    const entry = createEntry(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      { status: "PRESENT" },
    );
    const correctedEntry = createEntry(
      entry.occurrence.id,
      { status: "ABSENT", debitStatus: "NOT_PROPOSED" },
    );
    const fetchMock = installFetch(async (_input, init) => {
      expect(JSON.parse(String(init?.body))).toEqual({
        note: null,
        operation: "CORRECT",
        status: "ABSENT",
      });
      return jsonResponse({ attendance: correctedEntry, movement: null, reversal: null });
    });

    render(<AttendanceScreen data={createData([entry])} />);
    await user.click(
      screen.getByRole("button", { name: `Corregir asistencia de ${tutor.formalName}` }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Corregir asistencia" });
    expect(within(dialog).getByText(/La corrección modifica el hecho de asistencia/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Guardar corrección" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("Falta")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recognizes only marked recoveries and exposes the linked origin", async () => {
    const user = userEvent.setup();
    const entry = createEntry(
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      {},
      {
        kind: "RECOVERY",
        recovery: {
          markedForRecovery: true,
          recognition: "EXPLICIT_ACTION_REQUIRED",
        },
      },
    );
    const recoveryMovement = {
      id: "movement-recovery-123456",
      category: { name: recoveryCategory.name },
    };
    const fetchMock = installFetch(async (_input, init) => {
      if (init?.method === "POST") {
        expect(JSON.parse(String(init.body))).toEqual({
          categoryId: recoveryCategory.id,
          note: null,
          operation: "RECOGNIZE_RECOVERY",
        });
        return jsonResponse({ attendance: entry, movement: recoveryMovement });
      }

      return jsonResponse(categoriesResponse);
    });

    render(<AttendanceScreen data={createData([entry])} />);
    await user.click(
      screen.getByRole("button", { name: `Reconocer recuperación de ${tutor.formalName}` }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Reconocer recuperación" });
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Categoría de recuperación")).toHaveValue(
        recoveryCategory.id,
      );
    });
    await user.click(within(dialog).getByRole("button", { name: "Reconocer recuperación" }));

    await waitFor(() => {
      expect(screen.getByText(/Recuperación reconocida · Recuperación de guardia · origen movement/)).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps dialog focus contained and returns it to the triggering action", async () => {
    const user = userEvent.setup();
    const entry = createEntry(
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      { debitStatus: "PROPOSED", proposedDebitMinutes: 120, status: "ABSENT" },
    );
    installFetch(async () => jsonResponse(categoriesResponse));

    render(<AttendanceScreen data={createData([entry])} />);
    const trigger = screen.getByRole("button", {
      name: `Confirmar débito por inasistencia para ${tutor.formalName}`,
    });
    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Confirmar débito por inasistencia" });
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it("exposes loading, empty, required-action, and error states", () => {
    const { rerender } = render(<AttendanceScreen data={null} state="loading" />);
    expect(screen.getByRole("status", { name: "Cargando asistencia" })).toBeInTheDocument();

    rerender(<AttendanceScreen data={createData([])} state="empty" />);
    expect(screen.getByText("No hay guardias para esta fecha")).toBeInTheDocument();

    rerender(<AttendanceScreen data={null} state="required-action" />);
    expect(screen.getByText("Abrir un ciclo para gestionar asistencia")).toBeInTheDocument();

    rerender(
      <AttendanceScreen
        data={null}
        initialErrorMessage="No se pudo cargar la asistencia de prueba."
        state="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo cargar la asistencia de prueba.",
    );
  });
});
