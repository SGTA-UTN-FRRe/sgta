import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveDefaultOperationalDate } from "./schedule-date";

afterEach(() => {
  vi.unstubAllEnvs();
});

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

  it("uses the configured server instant when no date is supplied", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SGTA_E2E_NOW", "2027-04-06T01:30:00.000Z");

    expect(resolveDefaultOperationalDate(cycle)).toBe("2027-04-05");
  });
});
