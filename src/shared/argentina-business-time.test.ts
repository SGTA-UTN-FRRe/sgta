import { describe, expect, it } from "vitest";

import { getArgentinaBusinessDate, getArgentinaDateTime } from "./argentina-business-time";

describe("Argentina business time", () => {
  it("uses the Buenos Aires calendar date around local midnight", () => {
    expect(
      getArgentinaBusinessDate(new Date("2027-04-06T01:30:00.000Z")),
    ).toBe("2027-04-05");
    expect(
      getArgentinaBusinessDate(new Date("2027-04-06T02:59:59.999Z")),
    ).toBe("2027-04-05");
    expect(
      getArgentinaBusinessDate(new Date("2027-04-06T03:00:00.000Z")),
    ).toBe("2027-04-06");
  });

  it("returns the Argentina-local minute of day for schedule cutoffs", () => {
    expect(getArgentinaDateTime(new Date("2027-04-06T01:30:00.000Z"))).toEqual({
      date: "2027-04-05",
      minuteOfDay: 22 * 60 + 30,
    });
  });
});
