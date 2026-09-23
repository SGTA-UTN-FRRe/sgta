import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ReportFilterOptions } from "@/features/reports/report-service";
import type { OperationalReport } from "@/features/reports/report-types";

import { ReportsScreen } from "./reports-screen";

const filterOptions: ReportFilterOptions = {
  careers: [{ id: "career-1", label: "Applied Science" }],
  subjects: [{ id: "subject-1", label: "Applied Algebra — Applied Science" }],
  tutors: [{ id: "tutor-1", label: "Owens, Iris" }],
  modalities: ["Virtual"],
};

function ready<T>(data: T) {
  return { status: "ready" as const, data };
}

function createReport(): OperationalReport {
  return {
    filters: {
      fromDate: "2026-09-18",
      toDate: "2026-09-21",
      careerId: "career-1",
      subjectId: "subject-1",
      tutorId: "tutor-1",
      modality: "Virtual",
    },
    currentCycle: ready({ id: "cycle-1", name: "2026" }),
    consultationDemand: ready({
      total: 4,
      subjectTotal: 2,
      generalTotal: 2,
      byCareer: { items: [{ key: "career-1", label: "Applied Science", count: 4 }], truncated: false },
      bySubject: { items: [{ key: "subject-1", label: "Applied Algebra", count: 2 }], truncated: false },
      byTutor: { items: [{ key: "tutor-1", label: "Owens, Iris", count: 4 }], truncated: false },
      byModality: { items: [{ key: "Virtual", label: "Virtual", count: 4 }], truncated: false },
      byAcademicStage: { items: [{ key: "First year", label: "First year", count: 4 }], truncated: false },
      byMonth: [{ key: "2026-09", label: "2026-09", count: 4 }],
    }),
    activeTutors: ready({ count: 3 }),
    subjectCoverage: ready({
      cycleId: "cycle-1",
      cycleName: "2026",
      coveredSubjects: 2,
      totalSubjects: 3,
      coveragePercent: 66.67,
    }),
    plannedSchedules: ready({
      totalOccurrences: 5,
      totalMinutes: 185,
      byKind: [
        { kind: "DUTY", count: 4, minutes: 165 },
        { kind: "RECOVERY", count: 1, minutes: 20 },
      ],
      byTutor: { items: [], truncated: false },
    }),
    attendance: ready({
      dueOccurrences: 4,
      present: 1,
      absent: 1,
      pending: 2,
      registered: 2,
      registrationRatePercent: 50,
    }),
    currentBalances: ready({
      cycleId: "cycle-1",
      cycleName: "2026",
      totalTutors: 3,
      owes: 1,
      current: 2,
    }),
    movements: ready({
      creditCount: 5,
      debitCount: 2,
      creditMinutes: 1_299,
      debitMinutes: 240,
      netMinutes: 1_059,
      groups: {
        items: [
          {
            date: "2026-09-21",
            direction: "CREDIT",
            categoryId: "category-1",
            category: "Report ledger",
            count: 1,
            minutes: 60,
          },
        ],
        truncated: false,
      },
    }),
    activities: ready({
      totalActivities: 4,
      totalMinutes: 75,
      groups: [
        { date: "2026-09-18", kind: "MEETING", count: 1, minutes: 30 },
        { date: "2026-09-19", kind: "WORKSHOP", count: 1, minutes: 15 },
        { date: "2026-09-20", kind: "EXTRAORDINARY", count: 1, minutes: 20 },
        { date: "2026-09-21", kind: "RECOVERY", count: 1, minutes: 10 },
      ],
    }),
  };
}

function createEmptyReport(): OperationalReport {
  const report = createReport();
  if (report.consultationDemand.status !== "ready") {
    throw new Error("The report fixture requires demand data.");
  }
  return {
    ...report,
    consultationDemand: ready({
      ...report.consultationDemand.data,
      total: 0,
      subjectTotal: 0,
      generalTotal: 0,
      byCareer: { items: [], truncated: false },
      bySubject: { items: [], truncated: false },
      byTutor: { items: [], truncated: false },
      byModality: { items: [], truncated: false },
      byAcademicStage: { items: [], truncated: false },
      byMonth: [],
    }),
    plannedSchedules: ready({
      totalOccurrences: 0,
      totalMinutes: 0,
      byKind: [
        { kind: "DUTY", count: 0, minutes: 0 },
        { kind: "RECOVERY", count: 0, minutes: 0 },
      ],
      byTutor: { items: [], truncated: false },
    }),
    attendance: ready({
      dueOccurrences: 0,
      present: 0,
      absent: 0,
      pending: 0,
      registered: 0,
      registrationRatePercent: null,
    }),
    movements: ready({
      creditCount: 0,
      debitCount: 0,
      creditMinutes: 0,
      debitMinutes: 0,
      netMinutes: 0,
      groups: { items: [], truncated: false },
    }),
    activities: ready({ totalActivities: 0, totalMinutes: 0, groups: [] }),
  };
}

describe("ReportsScreen", () => {
  it("initializes shareable filters and presents the complete table-based report", () => {
    render(
      <ReportsScreen
        filterOptions={filterOptions}
        query={{}}
        report={createReport()}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Reportes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-09-18");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-09-21");
    expect(screen.getByRole("combobox", { name: "Carrera" })).toHaveValue("career-1");
    expect(screen.getByRole("combobox", { name: "Materia" })).toHaveValue("subject-1");
    expect(screen.getByRole("combobox", { name: "Tutor" })).toHaveValue("tutor-1");
    expect(screen.getByRole("combobox", { name: "Modalidad" })).toHaveValue("Virtual");

    const form = screen.getByRole("button", { name: "Aplicar filtros" }).closest("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/admin/reports");
    expect(screen.getByRole("link", { name: "Restablecer filtros" })).toHaveAttribute(
      "href",
      "/admin/reports",
    );
    expect(screen.getByRole("heading", { level: 2, name: "Demanda" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cobertura y asistencia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Horas y actividades" })).toBeInTheDocument();
    expect(screen.getAllByText("21/09/2026")).not.toHaveLength(0);
    expect(screen.getByText("5 · 21 h 39 min")).toBeInTheDocument();

    const careerTableRegion = screen.getByRole("region", { name: "Carrera" });
    expect(careerTableRegion).toHaveAttribute("tabindex", "0");
    expect(within(careerTableRegion).getByRole("columnheader", { name: "Consultas" })).toBeInTheDocument();
  });

  it("preserves invalid query values and shows validation feedback", () => {
    render(
      <ReportsScreen
        filterErrors={["La fecha inicial no tiene un formato válido."]}
        filterOptions={filterOptions}
        query={{ fromDate: "not-a-date", toDate: "2026-09-21" }}
        report={null}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "La fecha inicial no tiene un formato válido.",
    );
    expect(screen.getByLabelText("Desde")).toHaveValue("not-a-date");
    expect(screen.getByLabelText("Desde")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-09-21");
    expect(screen.queryByRole("heading", { level: 2, name: "Resumen" })).not.toBeInTheDocument();
  });

  it("announces an empty period while retaining current snapshots", () => {
    render(
      <ReportsScreen
        filterOptions={filterOptions}
        query={{ fromDate: "2024-04-03", toDate: "2024-04-03" }}
        report={createEmptyReport()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No hay datos para los filtros seleccionados.",
    );
    expect(screen.getByText("Tutores activos")).toBeInTheDocument();
    expect(screen.getAllByText(/Estado actual .*2026/)).not.toHaveLength(0);
  });

  it("keeps unaffected sections visible when report sections fail", () => {
    const report = createReport();
    report.consultationDemand = { status: "error" };
    report.movements = { status: "error" };

    render(
      <ReportsScreen
        filterOptions={filterOptions}
        query={{ fromDate: "2026-09-18", toDate: "2026-09-21" }}
        report={report}
      />,
    );

    expect(screen.getByText("Carga parcial")).toBeInTheDocument();
    expect(screen.getByText("No se pudo cargar la demanda de consultas")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar los movimientos")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cobertura y asistencia" })).toBeInTheDocument();
    expect(screen.getByText(/Estado actual .*2026 .*filtros de carrera, materia y tutor/)).toBeInTheDocument();
  });
});
