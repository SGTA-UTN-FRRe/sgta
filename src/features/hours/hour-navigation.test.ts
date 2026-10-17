import { describe, expect, it } from "vitest";

import { movementHistoryHref } from "./hour-navigation";

describe("movementHistoryHref", () => {
  it("opens the unfiltered history without an empty query string", () => {
    expect(movementHistoryHref()).toBe("/admin/hours/movements");
    expect(movementHistoryHref("", "", "")).toBe("/admin/hours/movements");
  });

  it("preserves the established filter names and encodes their values", () => {
    expect(movementHistoryHref("cycle & 2026", "tutor/one", "category+two")).toBe(
      "/admin/hours/movements?cycleId=cycle+%26+2026&tutorId=tutor%2Fone&categoryId=category%2Btwo",
    );
  });

  it("keeps only the selected filters", () => {
    expect(movementHistoryHref("cycle")).toBe("/admin/hours/movements?cycleId=cycle");
    expect(movementHistoryHref("", "tutor")).toBe("/admin/hours/movements?tutorId=tutor");
    expect(movementHistoryHref("cycle", "", "category")).toBe(
      "/admin/hours/movements?cycleId=cycle&categoryId=category",
    );
  });
});
