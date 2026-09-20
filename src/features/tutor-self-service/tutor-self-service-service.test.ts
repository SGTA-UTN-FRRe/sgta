import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  calculateTutorSelfServiceBalance,
  resolveTutorSelfServiceScheduleWindow,
  selectTutorSelfServiceAssignmentsForDate,
  selectTutorSelfServiceEffectivePlan,
  toSafeTutorMovement,
  TUTOR_SELF_SERVICE_ERROR_CODES,
  TutorSelfServiceError,
} from "./tutor-self-service-service";
import {
  tutorSelfServiceHoursQuerySchema,
  tutorSelfServiceScheduleQuerySchema,
} from "./tutor-self-service-validation";

const cycle = {
  startDate: "2027-01-01",
  endDate: "2027-12-31",
};

function makePlan(
  overrides: Partial<{
    id: string;
    kind: "REGULAR" | "SPECIAL";
    validFrom: string;
    validTo: string;
    status: "ACTIVE" | "INACTIVE";
    updatedAt: string;
  }> = {},
) {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    cycleId: "22222222-2222-4222-8222-222222222222",
    name: "Regular plan",
    kind: overrides.kind ?? "REGULAR",
    validFrom: overrides.validFrom ?? "2027-01-01",
    validTo: overrides.validTo ?? "2027-12-31",
    status: overrides.status ?? "ACTIVE",
    createdAt: new Date("2027-01-01T00:00:00.000Z"),
    updatedAt: new Date(
      overrides.updatedAt ?? "2027-01-01T00:00:00.000Z",
    ),
  };
}

describe("Tutor self-service read models", () => {
  it("keeps schedule filters strict and validates complete week windows", () => {
    expect(() =>
      tutorSelfServiceScheduleQuerySchema.parse({ tutorId: "other-tutor" }),
    ).toThrow();
    expect(() =>
      tutorSelfServiceScheduleQuerySchema.parse({ weekStart: "2027-04-05" }),
    ).toThrow();
    expect(() =>
      tutorSelfServiceScheduleQuerySchema.parse({
        date: "2027-04-05",
        weekStart: "2027-04-05",
        weekEnd: "2027-04-11",
      }),
    ).toThrow();
    expect(tutorSelfServiceHoursQuerySchema.parse({})).toEqual({});
    expect(() => tutorSelfServiceHoursQuerySchema.parse({ tutorId: "x" })).toThrow();
  });

  it("anchors and clips the default schedule window to the current cycle", () => {
    expect(
      resolveTutorSelfServiceScheduleWindow(
        cycle,
        {},
        "2027-04-05",
      ),
    ).toEqual({
      mode: "current",
      anchorDate: "2027-04-05",
      startDate: "2027-04-05",
      endDate: "2027-04-11",
    });
    expect(
      resolveTutorSelfServiceScheduleWindow(
        { startDate: "2027-04-28", endDate: "2027-05-02" },
        {},
        "2027-04-20",
      ),
    ).toMatchObject({
      mode: "upcoming",
      anchorDate: "2027-04-28",
      startDate: "2027-04-28",
      endDate: "2027-05-02",
    });
    expect(
      resolveTutorSelfServiceScheduleWindow(cycle, {}, "2028-01-01"),
    ).toEqual({
      mode: "empty-upcoming",
      anchorDate: null,
      startDate: null,
      endDate: null,
    });
    expect(
      resolveTutorSelfServiceScheduleWindow(
        cycle,
        { date: "2027-12-29" },
        "2027-12-01",
      ),
    ).toMatchObject({ startDate: "2027-12-29", endDate: "2027-12-31" });
    expect(() =>
      resolveTutorSelfServiceScheduleWindow(
        cycle,
        { weekStart: "2026-12-28", weekEnd: "2027-01-03" },
        "2027-01-01",
      ),
    ).toThrowError(
      expect.objectContaining({
        code: TUTOR_SELF_SERVICE_ERROR_CODES.dateOutsideCycle,
      }),
    );
  });

  it("applies special-plan precedence and regular fallback", () => {
    const regular = makePlan({ id: "regular", updatedAt: "2027-01-02" });
    const special = makePlan({
      id: "special",
      kind: "SPECIAL",
      validFrom: "2027-04-05",
      validTo: "2027-04-07",
    });

    expect(selectTutorSelfServiceEffectivePlan([regular, special], "2027-04-05"))
      .toMatchObject({ id: "special" });
    expect(selectTutorSelfServiceEffectivePlan([regular, special], "2027-04-08"))
      .toMatchObject({ id: "regular" });
    expect(selectTutorSelfServiceEffectivePlan([regular], "2026-12-31")).toBeNull();
    expect(() =>
      selectTutorSelfServiceEffectivePlan(
        [
          special,
          makePlan({
            id: "special-2",
            kind: "SPECIAL",
            validFrom: "2027-04-05",
            validTo: "2027-04-07",
          }),
        ],
        "2027-04-05",
      ),
    ).toThrowError(
      expect.objectContaining({
        code: TUTOR_SELF_SERVICE_ERROR_CODES.specialPlanOverlap,
      }),
    );
  });

  it("selects chronological assignments for the effective plan and date", () => {
    const plan = makePlan({ id: "regular" });
    const assignments = [
      {
        id: "late",
        planId: plan.id,
        pattern: "WEEKDAY" as const,
        weekday: 1,
        assignmentDate: null,
        startMinutes: 720,
        endMinutes: 780,
        kind: "DUTY" as const,
        modality: "Online",
      },
      {
        id: "early",
        planId: plan.id,
        pattern: "DATE" as const,
        weekday: null,
        assignmentDate: "2027-04-05",
        startMinutes: 600,
        endMinutes: 660,
        kind: "DUTY" as const,
        modality: null,
      },
      {
        id: "other-day",
        planId: plan.id,
        pattern: "DATE" as const,
        weekday: null,
        assignmentDate: "2027-04-06",
        startMinutes: 480,
        endMinutes: 540,
        kind: "DUTY" as const,
        modality: null,
      },
    ];

    expect(
      selectTutorSelfServiceAssignmentsForDate(assignments, plan, "2027-04-05"),
    ).toEqual([assignments[1], assignments[0]]);
  });

  it("derives signed balance and exposes a privacy-safe movement DTO", () => {
    expect(
      calculateTutorSelfServiceBalance([
        { direction: "CREDIT", durationMinutes: 120 },
        { direction: "DEBIT", durationMinutes: 45 },
      ]),
    ).toEqual({ signedBalanceMinutes: 75, state: "current" });

    const movement = toSafeTutorMovement(
      {
        id: "movement-1",
        categoryId: "category-1",
        categoryName: "Guardia",
        categoryActivityKind: null,
        categoryStatus: "ACTIVE",
        direction: "CREDIT",
        durationMinutes: 120,
        movementDate: "2027-04-05",
        note: "Own movement",
        reversalOfMovementId: null,
        createdAt: new Date("2027-04-05T12:00:00.000Z"),
      },
      null,
    );

    expect(movement).toMatchObject({
      id: "movement-1",
      signedDurationMinutes: 120,
      reversalState: "CONFIRMED",
    });
    expect(JSON.stringify(movement)).not.toContain("actor");
    expect(JSON.stringify(movement)).not.toContain("tutor");
    expect(JSON.stringify(movement)).not.toContain("audit");
    expect(JSON.stringify(movement)).not.toContain("session");
  });

  it("uses a stable domain error for schedule conflicts", () => {
    const error = new TutorSelfServiceError(
      TUTOR_SELF_SERVICE_ERROR_CODES.specialPlanOverlap,
      "conflict",
    );

    expect(error).toBeInstanceOf(TutorSelfServiceError);
    expect(error.code).toBe(TUTOR_SELF_SERVICE_ERROR_CODES.specialPlanOverlap);
  });
});
