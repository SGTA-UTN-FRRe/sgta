import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/db/client-core";

import {
  createSchedulePlan,
  mapScheduleMutationError,
  SCHEDULE_ERROR_CODES,
  ScheduleServiceError,
} from "./schedule-service";

function asDatabase(value: unknown) {
  return value as Database;
}

describe("schedule service boundary", () => {
  it("requires an actor before opening a plan transaction", async () => {
    const transaction = vi.fn();

    await expect(
      createSchedulePlan(asDatabase({ transaction }), {
        cycleId: "11111111-1111-4111-8111-111111111111",
        name: "Regular 2027",
        kind: "REGULAR",
        validFrom: "2027-01-01",
        validTo: "2027-12-31",
      }),
    ).rejects.toMatchObject({ code: SCHEDULE_ERROR_CODES.actorRequired });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("maps unique constraint failures to stable conflict errors", () => {
    const mapped = mapScheduleMutationError({
      cause: {
        code: "23505",
        constraint: "schedule_plan_active_regular_unique",
      },
    });

    expect(mapped).toMatchObject({
      code: SCHEDULE_ERROR_CODES.regularPlanConflict,
    });
    expect(mapped.message).not.toContain("schedule_plan_active_regular_unique");
  });

  it("preserves domain errors for callers", () => {
    const error = new ScheduleServiceError(
      SCHEDULE_ERROR_CODES.specialPlanOverlap,
      "The special plan validity overlaps another active special plan.",
      { details: { conflictingPlanIds: ["plan-1"], date: "2027-03-01" } },
    );

    expect(mapScheduleMutationError(error)).toBe(error);
  });
});
