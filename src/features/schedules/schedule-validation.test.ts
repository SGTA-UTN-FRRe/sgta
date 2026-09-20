import { describe, expect, it } from "vitest";

import {
  assignmentWindowsOverlap,
  createScheduleAssignmentInputSchema,
  createSchedulePlanInputSchema,
  getIsoWeekday,
} from "./schedule-validation";

describe("schedule validation", () => {
  it("rejects invalid calendar dates, reversed validity, and unknown keys", () => {
    expect(() =>
      createSchedulePlanInputSchema.parse({
        cycleId: "11111111-1111-4111-8111-111111111111",
        name: "Regular",
        kind: "REGULAR",
        validFrom: "2027-02-30",
        validTo: "2027-03-01",
      }),
    ).toThrow();

    expect(() =>
      createSchedulePlanInputSchema.parse({
        cycleId: "11111111-1111-4111-8111-111111111111",
        name: "Special",
        kind: "SPECIAL",
        validFrom: "2027-03-10",
        validTo: "2027-03-01",
      }),
    ).toThrow();

    expect(() =>
      createSchedulePlanInputSchema.parse({
        cycleId: "11111111-1111-4111-8111-111111111111",
        name: "Regular",
        kind: "REGULAR",
        validFrom: "2027-03-01",
        validTo: "2027-03-10",
        unexpected: true,
      }),
    ).toThrow();
  });

  it("requires one assignment date pattern and a positive time interval", () => {
    const common = {
      planId: "11111111-1111-4111-8111-111111111111",
      tutorId: "22222222-2222-4222-8222-222222222222",
      startMinutes: 480,
      endMinutes: 600,
    };

    expect(() =>
      createScheduleAssignmentInputSchema.parse({
        ...common,
        pattern: "WEEKDAY",
        weekday: 1,
        assignmentDate: "2027-03-01",
      }),
    ).toThrow();
    expect(() =>
      createScheduleAssignmentInputSchema.parse({
        ...common,
        pattern: "DATE",
        assignmentDate: "2027-03-01",
        startMinutes: 600,
        endMinutes: 600,
      }),
    ).toThrow();
  });

  it("calculates ISO weekdays and modeled recurrence overlap", () => {
    expect(getIsoWeekday("2027-03-01")).toBe(1);
    expect(getIsoWeekday("2027-03-07")).toBe(7);

    const mondayMorning = {
      pattern: "WEEKDAY" as const,
      weekday: 1,
      assignmentDate: null,
      startMinutes: 480,
      endMinutes: 600,
    };
    const mondayMidday = {
      ...mondayMorning,
      startMinutes: 540,
      endMinutes: 660,
    };
    const mondayEvening = {
      ...mondayMorning,
      startMinutes: 600,
      endMinutes: 660,
    };
    const dateAssignment = {
      pattern: "DATE" as const,
      weekday: null,
      assignmentDate: "2027-03-01",
      startMinutes: 500,
      endMinutes: 520,
    };

    expect(
      assignmentWindowsOverlap(
        mondayMorning,
        mondayMidday,
        "2027-03-01",
        "2027-03-31",
      ),
    ).toBe(true);
    expect(
      assignmentWindowsOverlap(
        mondayMorning,
        mondayEvening,
        "2027-03-01",
        "2027-03-31",
      ),
    ).toBe(false);
    expect(
      assignmentWindowsOverlap(
        mondayMorning,
        dateAssignment,
        "2027-03-01",
        "2027-03-31",
      ),
    ).toBe(true);
  });
});
