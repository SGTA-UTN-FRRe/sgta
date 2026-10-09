import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

describe("formatDuration", () => {
  it.each([[0, "0 min"], [30, "30 min"], [60, "1 h"], [90, "1 h 30 min"], [-90, "1 h 30 min"]])("formats %i minutes as %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
  it("adds signs only to nonzero movements", () => {
    expect(formatDuration(90, { signed: true })).toBe("+1 h 30 min");
    expect(formatDuration(-90, { signed: true })).toBe("−1 h 30 min");
    expect(formatDuration(0, { signed: true })).toBe("0 min");
  });
});
