import { describe, expect, it } from "vitest";

import type { SafeScheduleAssignment, SafeSchedulePlan } from "./schedule-service";
import {
  buildScheduleMatrix,
  formatAssignmentPerson,
  getPlanDays,
  toAssignmentView,
  withDisplayNames,
} from "./schedule-view-model";

const plan: SafeSchedulePlan = {
  createdAt: "2026-08-01T12:00:00.000Z",
  cycleId: "11111111-1111-4111-8111-111111111111",
  id: "22222222-2222-4222-8222-222222222222",
  kind: "REGULAR",
  name: "Regular",
  status: "ACTIVE",
  updatedAt: "2026-08-01T12:00:00.000Z",
  validFrom: "2026-08-03",
  validTo: "2026-11-27",
};

let sequence = 0;

function assignment(overrides: Partial<SafeScheduleAssignment>) {
  sequence += 1;
  return toAssignmentView(
    {
      assignmentDate: null,
      careerColor: "BLUE",
      careerName: "Ingeniería Química",
      createdAt: "2026-08-02T12:00:00.000Z",
      endMinutes: 600,
      id: `assignment-${sequence}`,
      kind: "DUTY",
      modality: "IN_PERSON",
      pattern: "WEEKDAY",
      planId: plan.id,
      startMinutes: 540,
      status: "ACTIVE",
      tutorDisplayName: `Tutor ${sequence}`,
      tutorId: `tutor-${sequence}`,
      tutorName: `Apellido, Tutor ${sequence}`,
      updatedAt: "2026-08-02T12:00:00.000Z",
      weekday: 1,
      ...overrides,
    },
    plan,
  );
}

describe("schedule matrix", () => {
  it("grades coverage by distinct in-person Tutors and ignores virtual ones", () => {
    const assignments = [
      assignment({ startMinutes: 540, endMinutes: 660 }),
      assignment({ startMinutes: 540, endMinutes: 600 }),
      assignment({ startMinutes: 600, endMinutes: 720, modality: "VIRTUAL" }),
    ];

    const { rows, summary } = buildScheduleMatrix(assignments, assignments, ["LUN"]);

    expect(rows.map((row) => (row.kind === "hour" ? row.cells.LUN?.coverage : row.kind))).toEqual([
      "covered",
      "minimal",
      "uncovered",
    ]);
    expect(summary).toEqual({ minimal: 1, uncovered: 1 });
  });

  it("flags one-hour holes and collapses longer gaps into a separator", () => {
    const assignments = [
      assignment({ startMinutes: 540, endMinutes: 600 }),
      assignment({ startMinutes: 660, endMinutes: 720 }),
      assignment({ startMinutes: 900, endMinutes: 960 }),
    ];

    const { rows } = buildScheduleMatrix(assignments, assignments, ["LUN"]);

    expect(
      rows.map((row) =>
        row.kind === "gap"
          ? `gap ${row.startMinutes}-${row.endMinutes}`
          : `${row.startMinutes} ${row.cells.LUN?.coverage}`,
      ),
    ).toEqual(["540 minimal", "600 uncovered", "660 minimal", "gap 720-900", "900 minimal"]);
  });

  it("keeps coverage on every assignment while showing only the filtered ones", () => {
    const shown = assignment({});
    const hidden = assignment({ careerName: "Ingeniería Civil" });

    const { rows } = buildScheduleMatrix([shown, hidden], [shown], ["LUN"]);
    const [row] = rows;

    expect(row?.kind === "hour" && row.cells.LUN).toMatchObject({
      assignments: [shown],
      coverage: "covered",
    });
  });

  it("marks hours of days without assignments as closed", () => {
    const monday = assignment({});

    const { rows, summary } = buildScheduleMatrix([monday], [monday], ["LUN", "MAR"]);

    expect(rows[0]?.kind === "hour" && rows[0].cells.MAR?.coverage).toBe("closed");
    expect(summary).toEqual({ minimal: 1, uncovered: 0 });
  });
});

describe("schedule display names", () => {
  it("uses the preferred name and keeps the formal name for identification", () => {
    const daniel = assignment({ tutorDisplayName: "Daniel", tutorName: "Acevedo, Mario Daniel" });
    const ana = assignment({ tutorDisplayName: "Ana", tutorName: "López, Ana" });

    expect(withDisplayNames([daniel, ana]).map((item) => item.displayName)).toEqual(["Daniel", "Ana"]);
    expect(formatAssignmentPerson(daniel)).toBe("Acevedo, Mario Daniel (Daniel)");
    expect(formatAssignmentPerson(ana)).toBe("López, Ana");
  });

  it("tells repeated names apart by last-name initial, then by career", () => {
    const names = withDisplayNames([
      assignment({ tutorDisplayName: "Ema", tutorId: "a", tutorName: "Gómez, Emanuel" }),
      assignment({ tutorDisplayName: "Ema", tutorId: "b", tutorName: "Paz, Emanuela" }),
      assignment({ tutorDisplayName: "Ema", tutorId: "a", tutorName: "Gómez, Emanuel", weekday: 2 }),
      assignment({ careerName: "Ingeniería Civil", tutorDisplayName: "Lu", tutorId: "c", tutorName: "Ríos, Lucía" }),
      assignment({ tutorDisplayName: "Lu", tutorId: "d", tutorName: "Ruiz, Luis" }),
    ]).map((item) => item.displayName);

    expect(names).toEqual(["Ema G.", "Ema P.", "Ema G.", "Lu R. IC", "Lu R. IQ"]);
  });

  it("adds weekend columns only when the plan uses them", () => {
    expect(getPlanDays([assignment({})])).toEqual(["LUN", "MAR", "MIÉ", "JUE", "VIE"]);
    expect(getPlanDays([assignment({ weekday: 7 })])).toEqual(["LUN", "MAR", "MIÉ", "JUE", "VIE", "DOM"]);
  });
});
