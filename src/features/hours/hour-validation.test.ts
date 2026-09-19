import { describe, expect, it } from "vitest";

import {
  createHourCategoryInputSchema,
  parseRecordBulkHourMovementInput,
  recordBulkHourMovementInputSchema,
} from "./hour-validation";

const cycleId = "11111111-1111-4111-8111-111111111111";
const categoryId = "22222222-2222-4222-8222-222222222222";
const tutorId = "33333333-3333-4333-8333-333333333333";

describe("hour validation", () => {
  it("converts hour and minute parts to a positive minute duration", () => {
    const parsed = parseRecordBulkHourMovementInput({
      cycleId,
      tutorIds: [tutorId],
      categoryId,
      direction: "CREDIT",
      duration: { hours: "1", minutes: "15" },
      movementDate: "2027-02-15",
      note: " Weekly coordination ",
    });

    expect(parsed.duration).toBe(75);
    expect(parsed.note).toBe("Weekly coordination");
  });

  it("rejects zero duration, duplicate tutors, invalid dates, and unknown fields", () => {
    expect(() =>
      recordBulkHourMovementInputSchema.parse({
        cycleId,
        tutorIds: [tutorId, tutorId],
        categoryId,
        direction: "CREDIT",
        duration: { hours: 0, minutes: 0 },
        movementDate: "2027-02-30",
        unexpected: true,
      }),
    ).toThrow();
  });

  it("limits activity kinds to the persisted domain enum", () => {
    expect(
      createHourCategoryInputSchema.parse({
        name: "Recovery",
        activityKind: "RECOVERY",
      }),
    ).toMatchObject({ name: "Recovery", activityKind: "RECOVERY" });

    expect(() =>
      createHourCategoryInputSchema.parse({
        name: "Unsupported",
        activityKind: "SCHEDULE",
      }),
    ).toThrow();
  });
});
