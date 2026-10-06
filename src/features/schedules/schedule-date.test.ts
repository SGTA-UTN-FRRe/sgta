import { describe, expect, it } from "vitest";

import { resolveDefaultOperationalDate } from "./schedule-date";

const cycle = {
  startDate: "2027-04-01",
  endDate: "2027-04-30",
};

describe("resolveDefaultOperationalDate", () => {
  it("clamps dates before the cycle to its start", () => {
    expect(
      resolveDefaultOperationalDate(
        cycle,
        new Date("2027-04-01T02:59:00.000Z"),
      ),
    ).toBe(cycle.startDate);
  });

  it("uses today's Argentina date inside the cycle, including late evening", () => {
    expect(
      resolveDefaultOperationalDate(
        cycle,
        new Date("2027-04-06T01:30:00.000Z"),
      ),
    ).toBe("2027-04-05");
  });

  it("clamps dates after the cycle to its end", () => {
    expect(
      resolveDefaultOperationalDate(
        cycle,
        new Date("2027-05-01T03:00:00.000Z"),
      ),
    ).toBe(cycle.endDate);
  });
});
