import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  ARGENTINA_TIME_ZONE,
  getArgentinaBusinessDate,
  getArgentinaDateTime,
} from "./argentina-business-time";

describe("Argentina business time", () => {
  it("uses the shared Argentina time zone", () => {
    expect(ARGENTINA_TIME_ZONE).toBe("America/Argentina/Buenos_Aires");
  });

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

  it("adds calendar days in UTC across month and year boundaries", () => {
    expect(addCalendarDays("2027-01-31", 1)).toBe("2027-02-01");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("handles leap days and negative offsets", () => {
    expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addCalendarDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addCalendarDays("2027-01-01", -1)).toBe("2026-12-31");
  });
});
